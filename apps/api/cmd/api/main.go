package main

import (
	"context"
	"fmt"
	nethttp "net/http"
	"os"
	"os/signal"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	emailadapter "github.com/liferise/backend/internal/adapters/email"
	firebaseadapter "github.com/liferise/backend/internal/adapters/firebase"
	adapterhttp "github.com/liferise/backend/internal/adapters/http"
	"github.com/liferise/backend/internal/adapters/http/handlers"
	"github.com/liferise/backend/internal/adapters/http/middleware"
	stripeAdapter "github.com/liferise/backend/internal/adapters/stripe"
	appbooking "github.com/liferise/backend/internal/application/booking"
	appfavorite "github.com/liferise/backend/internal/application/favorite"
	appnotification "github.com/liferise/backend/internal/application/notification"
	apppayment "github.com/liferise/backend/internal/application/payment"
	appservice "github.com/liferise/backend/internal/application/service"
	appuser "github.com/liferise/backend/internal/application/user"
	"github.com/liferise/backend/internal/infrastructure/config"
	"github.com/liferise/backend/internal/infrastructure/database"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/auth"
)

// @title LifeRise Customer API
// @version 1.0
// @description Customer-facing mobile API for the LifeRise service marketplace.
// @host api.liferise.io
// @BasePath /api
func main() {
	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal("failed to load config", zap.Error(err))
	}
	if err := cfg.Validate(); err != nil {
		logger.Fatal("invalid configuration", zap.Error(err))
	}

	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// ── Early HTTP listener ───────────────────────────────────────────────────
	// Bind the port immediately so Railway/load-balancers see the process as
	// alive while the database is still connecting (can take several seconds on
	// cold start).  /health returns 503 {"status":"starting"} until the full
	// Gin router is atomically swapped in below.
	//
	// handlerBox is a concrete wrapper so that atomic.Value always stores the
	// same type (storing *ServeMux then *gin.Engine would panic at runtime).
	type handlerBox struct{ h nethttp.Handler }

	var activeHandler atomic.Value

	startupMux := nethttp.NewServeMux()
	startupMux.HandleFunc("/health", func(w nethttp.ResponseWriter, _ *nethttp.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(nethttp.StatusServiceUnavailable)
		fmt.Fprint(w, `{"status":"starting"}`)
	})
	startupMux.HandleFunc("/", func(w nethttp.ResponseWriter, _ *nethttp.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(nethttp.StatusServiceUnavailable)
		fmt.Fprint(w, `{"status":"starting","message":"server is initializing"}`)
	})
	activeHandler.Store(handlerBox{h: startupMux})

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &nethttp.Server{
		Addr: addr,
		Handler: nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
			activeHandler.Load().(handlerBox).h.ServeHTTP(w, r)
		}),
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	go func() {
		logger.Info("listening (startup mode)", zap.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != nethttp.ErrServerClosed {
			logger.Fatal("server failed", zap.Error(err))
		}
	}()
	// ─────────────────────────────────────────────────────────────────────────

	db, err := database.NewFromConfig(cfg)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	jwtService := auth.NewService(auth.Config{
		Secret:        cfg.JWT.Secret,
		AccessExpiry:  cfg.JWT.AccessExpiry,
		RefreshExpiry: cfg.JWT.RefreshExpiry,
		Issuer:        cfg.JWT.Issuer,
	})

	// Repositories
	userRepo := persistence.NewUserRepo()
	customerRepo := persistence.NewCustomerRepo()
	bookingRepo := persistence.NewBookingRepo()
	paymentRepo := persistence.NewPaymentRepo()
	connectRepo := persistence.NewConnectRepo()
	idempotencyRepo := persistence.NewWebhookIdempotencyRepo()
	serviceRepo := persistence.NewServiceRepo()
	favoriteRepo := persistence.NewFavoriteRepo()
	slotRepo := persistence.NewSlotRepo()

	// Asynq client (task enqueuing)
	asynqClient := asynq.NewClient(asynq.RedisClientOpt{
		Addr:     fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	defer asynqClient.Close()

	// Firebase FCM client (optional)
	var fcmClient appnotification.FCMClient
	if cfg.Firebase.CredentialsPath != "" {
		fcm, err := firebaseadapter.NewFCMClient(context.Background(), cfg.Firebase.CredentialsPath)
		if err != nil {
			logger.Warn("failed to initialize firebase fcm client; push notifications disabled", zap.Error(err))
		} else {
			fcmClient = fcm
			logger.Info("firebase fcm client initialized")
		}
	}

	// SMTP email client (optional)
	var emailClient appnotification.EmailClient
	if cfg.Mail.Host != "" {
		smtpClient := emailadapter.NewSMTPClient(cfg.Mail)
		emailClient = emailadapter.NewTemplateSender(smtpClient)
		logger.Info("smtp email client configured", zap.String("host", cfg.Mail.Host))
	}

	// Use Cases
	notificationUC := appnotification.NewUseCase(asynqClient, fcmClient, emailClient)

	authUC := appuser.NewAuthUseCase(db, userRepo, customerRepo, jwtService, notificationUC)

	stripeClient := stripeAdapter.NewClient(cfg.Stripe.SecretKey, cfg.Stripe.WebhookSecret)
	stripeUC := apppayment.NewStripeUseCase(db, stripeClient, paymentRepo, bookingRepo, connectRepo, idempotencyRepo)

	serviceUC := appservice.NewUseCase(db, serviceRepo)
	favoriteUC := appfavorite.NewUseCase(db, favoriteRepo)
	bookingUC := appbooking.NewUseCase(db, bookingRepo, slotRepo, serviceRepo)

	// Handlers
	authHandler := handlers.NewAuthHandler(authUC, cfg.App.URL)
	bookingHandler := handlers.NewBookingHandler(bookingUC)
	paymentHandler := handlers.NewPaymentHandler(stripeUC, cfg.Stripe.WebhookSecret)
	serviceHandler := handlers.NewServiceHandler(serviceUC)
	favoriteHandler := handlers.NewFavoriteHandler(favoriteUC)
	notificationHandler := handlers.NewNotificationHandler(notificationUC)

	r := gin.New()
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.StructuredLogging(logger))
	r.Use(gin.Recovery())
	r.Use(middleware.NewCORS(cfg.CORS))

	adapterhttp.RegisterRoutes(r, &adapterhttp.ServerConfig{
		JWTService:          jwtService,
		AuthHandler:         authHandler,
		BookingHandler:      bookingHandler,
		PaymentHandler:      paymentHandler,
		ServiceHandler:      serviceHandler,
		FavoriteHandler:     favoriteHandler,
		NotificationHandler: notificationHandler,
	})

	// Swap the startup handler for the fully-wired Gin router (zero downtime).
	activeHandler.Store(handlerBox{h: r})
	logger.Info("customer API server ready", zap.String("addr", addr))

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("server forced to shutdown", zap.Error(err))
	}
	logger.Info("server exited gracefully")
}
