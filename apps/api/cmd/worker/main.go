package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	emailadapter "github.com/liferise/backend/internal/adapters/email"
	firebaseadapter "github.com/liferise/backend/internal/adapters/firebase"
	"github.com/liferise/backend/internal/adapters/queue/tasks"
	"github.com/liferise/backend/internal/infrastructure/config"
	"github.com/liferise/backend/internal/infrastructure/database"
	"github.com/liferise/backend/internal/infrastructure/persistence"
)

// tokenPrunerWrapper adapts the persistence repo to the tasks.TokenPruner interface.
type tokenPrunerWrapper struct {
	db   interface{}
	repo *persistence.DeviceTokenRepo
}

func (w *tokenPrunerWrapper) Delete(ctx context.Context, token string) error {
	return w.repo.Delete(ctx, w.db, token)
}

func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("failed to load config", zap.Error(err))
	}

	// Database connection (required for token pruning)
	db, err := database.NewFromConfig(cfg)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	deviceTokenRepo := persistence.NewDeviceTokenRepo()
	announcementRepo := persistence.NewAnnouncementRepo()

	// Wrap the repository to satisfy the tasks.TokenPruner interface (curries db).
	tokenPruner := &tokenPrunerWrapper{db: db, repo: deviceTokenRepo}

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
	var fcmSender func(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]string, error)
	if cfg.Firebase.CredentialsPath != "" {
		fcm, err := firebaseadapter.NewFCMClient(context.Background(), cfg.Firebase.CredentialsPath)
		if err != nil {
			logger.Warn("failed to initialize firebase fcm client; push notifications disabled", zap.Error(err))
		} else {
			fcmSender = fcm.SendToDevices
			logger.Info("firebase fcm client initialized")
		}
	}

	// Email client (SMTP or Resend)
	var emailSender func(ctx context.Context, to, subject, body string) error
	var templatedSender tasks.TemplatedEmailSender
	switch cfg.Mail.Driver {
	case "resend":
		if cfg.Mail.ResendAPIKey != "" {
			resendClient := emailadapter.NewResendClient(cfg.Mail.ResendAPIKey, cfg.Mail.FromAddress, cfg.Mail.FromName)
			emailSender = resendClient.Send
			templatedSender = emailadapter.NewTemplateSender(resendClient)
			logger.Info("resend email client configured")
		} else {
			logger.Warn("resend driver selected but LIFERISE_MAIL_RESEND_API_KEY is empty")
		}
	default:
		if cfg.Mail.Host != "" {
			smtpClient := emailadapter.NewSMTPClient(cfg.Mail)
			emailSender = smtpClient.Send
			templatedSender = emailadapter.NewTemplateSender(smtpClient)
			logger.Info("smtp email client configured", zap.String("host", cfg.Mail.Host))
		}
	}

	// Announcement email processor: fetches announcement, resolves recipients, sends via Resend/SMTP.
	announcementEmailProcessor := func(ctx context.Context, announcementID uint64, audience string) error {
		a, err := announcementRepo.GetByID(ctx, db, announcementID)
		if err != nil {
			logger.Error("failed to fetch announcement for email", zap.Uint64("announcement_id", announcementID), zap.Error(err))
			return fmt.Errorf("fetch announcement: %w", err)
		}

		portalURL := cfg.App.URL
		if portalURL == "" {
			portalURL = "https://liferise.io"
		}
		portalURL = fmt.Sprintf("%s/resident/announcements", portalURL)

		var emails []string
		switch audience {
		case "residents":
			err = db.WithContext(ctx).Model(&struct{ Email string }{}).Table("customers").Where("deleted_at IS NULL AND status = ?", "active").Pluck("email", &emails).Error
		case "vendors":
			err = db.WithContext(ctx).Table("users").Select("DISTINCT users.email").Joins("JOIN user_role_assignments ON user_role_assignments.user_id = users.id").Joins("JOIN roles ON roles.id = user_role_assignments.role_id").Where("users.deleted_at IS NULL AND users.status = ? AND roles.slug = ?", "active", "service_provider").Pluck("email", &emails).Error
		case "all":
			var customers, vendors []string
			if e := db.WithContext(ctx).Model(&struct{ Email string }{}).Table("customers").Where("deleted_at IS NULL AND status = ?", "active").Pluck("email", &customers).Error; e != nil {
				err = e
				break
			}
			if e := db.WithContext(ctx).Table("users").Select("DISTINCT users.email").Joins("JOIN user_role_assignments ON user_role_assignments.user_id = users.id").Joins("JOIN roles ON roles.id = user_role_assignments.role_id").Where("users.deleted_at IS NULL AND users.status = ? AND roles.slug = ?", "active", "service_provider").Pluck("email", &vendors).Error; e != nil {
				err = e
				break
			}
			emails = append(customers, vendors...)
		default:
			logger.Warn("unknown audience for announcement email", zap.String("audience", audience))
			return fmt.Errorf("unknown audience: %s", audience)
		}
		if err != nil {
			logger.Error("failed to resolve recipient emails", zap.Uint64("announcement_id", announcementID), zap.String("audience", audience), zap.Error(err))
			return fmt.Errorf("resolve recipients: %w", err)
		}

		if templatedSender == nil {
			logger.Warn("no templated sender configured; skipping announcement emails", zap.Uint64("announcement_id", announcementID))
			return nil
		}

		var sendErrs []error
		for _, to := range emails {
			if err := templatedSender.SendTemplated(ctx, to, a.Title, "announcement", map[string]string{
				"Title":     a.Title,
				"Body":      a.Body,
				"PortalURL": portalURL,
			}); err != nil {
				logger.Error("failed to send announcement email", zap.String("to", to), zap.Uint64("announcement_id", announcementID), zap.Error(err))
				sendErrs = append(sendErrs, err)
				continue
			}
			logger.Info("announcement email sent", zap.String("to", to), zap.Uint64("announcement_id", announcementID))
		}

		if len(sendErrs) > 0 {
			return fmt.Errorf("failed to send %d/%d announcement emails", len(sendErrs), len(emails))
		}
		return nil
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
	handler.TokenPruner = tokenPruner
	handler.AnnouncementEmailHandler = announcementEmailProcessor

	mux := asynq.NewServeMux()
	mux.HandleFunc(tasks.TypeEmailDelivery, handler.HandleEmailDelivery)
	mux.HandleFunc(tasks.TypeFCMNotification, handler.HandleFCMNotification)
	mux.HandleFunc(tasks.TypeBookingReminder, handler.HandleBookingReminder)
	mux.HandleFunc(tasks.TypeAnnouncementEmail, handler.HandleAnnouncementEmail)

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
