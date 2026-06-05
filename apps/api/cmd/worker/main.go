package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	firebaseadapter "github.com/liferise/backend/internal/adapters/firebase"
	emailadapter "github.com/liferise/backend/internal/adapters/email"
	"github.com/liferise/backend/internal/adapters/queue/tasks"
	"github.com/liferise/backend/internal/infrastructure/config"
)

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("failed to load config", zap.Error(err))
	}

	redisOpt := asynq.RedisClientOpt{
		Addr:     fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	}

	// Asynq server
	srv := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency: cfg.Asynq.Concurrency,
		Queues: map[string]int{
			"critical": 6,
			"default":  3,
			"low":      1,
		},
		ErrorHandler: asynq.ErrorHandlerFunc(func(ctx context.Context, task *asynq.Task, err error) {
			logger.Error("task failed",
				zap.String("type", task.Type()),
				zap.Error(err),
			)
		}),
	})

	// Firebase FCM client (optional)
	var fcmSender func(ctx context.Context, tokens []string, title, body string, data map[string]string) error
	if cfg.Firebase.CredentialsPath != "" {
		fcm, err := firebaseadapter.NewFCMClient(context.Background(), cfg.Firebase.CredentialsPath)
		if err != nil {
			logger.Warn("failed to initialize firebase fcm client; push notifications disabled", zap.Error(err))
		} else {
			fcmSender = fcm.SendToDevices
			logger.Info("firebase fcm client initialized")
		}
	}

	// SMTP email client (optional)
	var emailSender func(ctx context.Context, to, subject, body string) error
	var templatedSender tasks.TemplatedEmailSender
	if cfg.Mail.Host != "" {
		smtpClient := emailadapter.NewSMTPClient(cfg.Mail)
		emailSender = smtpClient.Send
		templatedSender = emailadapter.NewTemplateSender(smtpClient)
		logger.Info("smtp email client configured", zap.String("host", cfg.Mail.Host))
	}

	// Task handlers with real dependencies injected
	handler := tasks.NewHandler(
		emailSender,
		fcmSender,
		func(ctx context.Context, bookingID uint64, reminderType string) error {
			logger.Info("processing reminder", zap.Uint64("booking_id", bookingID), zap.String("type", reminderType))
			return nil
		},
	)
	handler.TemplatedSender = templatedSender

	mux := asynq.NewServeMux()
	mux.HandleFunc(tasks.TypeEmailDelivery, handler.HandleEmailDelivery)
	mux.HandleFunc(tasks.TypeFCMNotification, handler.HandleFCMNotification)
	mux.HandleFunc(tasks.TypeBookingReminder, handler.HandleBookingReminder)

	logger.Info("starting worker server", zap.Int("concurrency", cfg.Asynq.Concurrency))

	go func() {
		if err := srv.Run(mux); err != nil {
			logger.Fatal("worker server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down worker server...")
	srv.Shutdown()
	logger.Info("worker server exited gracefully")
}
