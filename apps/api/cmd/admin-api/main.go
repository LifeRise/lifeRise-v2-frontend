package main

import (
	"context"
	"fmt"
	nethttp "net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/hibiken/asynq"
	"go.uber.org/zap"

	emailadapter "github.com/liferise/backend/internal/adapters/email"
	firebaseadapter "github.com/liferise/backend/internal/adapters/firebase"
	adapterhttp "github.com/liferise/backend/internal/adapters/http"
	handlers "github.com/liferise/backend/internal/adapters/http/handlers"
	"github.com/liferise/backend/internal/adapters/http/middleware"
	stripeAdapter "github.com/liferise/backend/internal/adapters/stripe"
	appaudit "github.com/liferise/backend/internal/application/audit"
	appbooking "github.com/liferise/backend/internal/application/booking"
	appdashboard "github.com/liferise/backend/internal/application/dashboard"
	appnotification "github.com/liferise/backend/internal/application/notification"
	apppayment "github.com/liferise/backend/internal/application/payment"
	appservice "github.com/liferise/backend/internal/application/service"
	appuser "github.com/liferise/backend/internal/application/user"
	"github.com/liferise/backend/internal/infrastructure/config"
	"github.com/liferise/backend/internal/infrastructure/database"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/auth"
)

// @title LifeRise Admin API
// @version 1.0
// @description Admin portal REST API for internal operations.
// @host admin-api.liferise.io
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

	userRepo := persistence.NewUserRepo()
	customerRepo := persistence.NewCustomerRepo()
	authUC := appuser.NewAuthUseCase(db, userRepo, customerRepo, jwtService, nil)

	bookingRepo := persistence.NewBookingRepo()
	paymentRepo := persistence.NewPaymentRepo()
	connectRepo := persistence.NewConnectRepo()
	idempotencyRepo := persistence.NewWebhookIdempotencyRepo()
	stripeClient := stripeAdapter.NewClient(cfg.Stripe.SecretKey, cfg.Stripe.WebhookSecret)
	stripeUC := apppayment.NewStripeUseCase(db, stripeClient, paymentRepo, bookingRepo, connectRepo, idempotencyRepo)

	serviceRepo := persistence.NewServiceRepo()
	serviceUC := appservice.NewUseCase(db, serviceRepo)
	slotRepo := persistence.NewSlotRepo()
	bookingUC := appbooking.NewUseCase(db, bookingRepo, slotRepo, serviceRepo)

	dashboardRepo := persistence.NewDashboardRepo()
	dashboardUC := appdashboard.NewOverviewUseCase(db, dashboardRepo)

	auditRepo := persistence.NewAuditRepo()
	auditLogger := appaudit.NewLogger(db, auditRepo)
	companyRepo := persistence.NewCompanyRepo()
	announcementRepo := persistence.NewAnnouncementRepo()
	bannerRepo := persistence.NewBannerRepo()
	faqRepo := persistence.NewFAQRepo()
	eventRepo := persistence.NewEventRepo()
	locationRepo := persistence.NewLocationRepo()
	supportRepo := persistence.NewSupportRepo()
	waitlistRepo := persistence.NewWaitlistRepo()
	feedbackRepo := persistence.NewFeedbackRepo()
	notificationRepo := persistence.NewNotificationRepo()
	deviceTokenRepo := persistence.NewDeviceTokenRepo()

	// Asynq client (task enqueuing for emails)
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

	// Email client (SMTP or Resend)
	var emailClient appnotification.EmailClient
	switch cfg.Mail.Driver {
	case "resend":
		if cfg.Mail.ResendAPIKey != "" {
			resendClient := emailadapter.NewResendClient(cfg.Mail.ResendAPIKey, cfg.Mail.FromAddress, cfg.Mail.FromName)
			emailClient = emailadapter.NewTemplateSender(resendClient)
			logger.Info("resend email client configured")
		} else {
			logger.Warn("resend driver selected but LIFERISE_MAIL_RESEND_API_KEY is empty")
		}
	default:
		if cfg.Mail.Host != "" {
			smtpClient := emailadapter.NewSMTPClient(cfg.Mail)
			emailClient = emailadapter.NewTemplateSender(smtpClient)
			logger.Info("smtp email client configured", zap.String("host", cfg.Mail.Host))
		}
	}

	notificationUC := appnotification.NewUseCase(db, notificationRepo, asynqClient, fcmClient, emailClient, deviceTokenRepo)

	authHandler := handlers.NewAuthHandler(authUC, cfg.App.URL)
	bookingHandler := handlers.NewBookingHandler(bookingUC)
	paymentHandler := handlers.NewPaymentHandler(stripeUC, cfg.Stripe.WebhookSecret)
	serviceHandler := handlers.NewServiceHandler(serviceUC)
	adminDashHandler := handlers.NewAdminDashboardHandler(dashboardUC)
	adminUserHandler := handlers.NewAdminUserHandler(db, userRepo, auditLogger, jwtService)
	adminCompanyHandler := handlers.NewAdminCompanyHandler(db, companyRepo, auditLogger)
	adminRoleHandler := handlers.NewAdminRoleHandler(db, userRepo, auditLogger)
	adminAnnouncementHandler := handlers.NewAdminAnnouncementHandler(db, announcementRepo, auditLogger, notificationUC)
	adminBannerHandler := handlers.NewAdminBannerHandler(db, bannerRepo, auditLogger)
	adminFAQHandler := handlers.NewAdminFAQHandler(db, faqRepo, auditLogger)
	adminEventHandler := handlers.NewAdminEventHandler(db, eventRepo, auditLogger)
	adminEventBookingHandler := handlers.NewAdminEventBookingHandler(db, eventRepo, auditLogger)
	adminEventResponseHandler := handlers.NewAdminEventResponseHandler(db, eventRepo, auditLogger)
	adminLocationHandler := handlers.NewAdminLocationHandler(db, locationRepo, auditLogger)
	adminServiceHandler := handlers.NewAdminServiceHandler(db, serviceRepo, auditLogger)
	adminSupportHandler := handlers.NewAdminSupportHandler(db, supportRepo, auditLogger)
	adminWaitlistHandler := handlers.NewAdminWaitlistHandler(db, waitlistRepo, auditLogger)
	adminBookingHandler := handlers.NewAdminBookingHandler(db, bookingRepo, auditLogger)
	adminCustomerHandler := handlers.NewAdminCustomerHandler(db, customerRepo, auditLogger)
	adminFeedbackHandler := handlers.NewAdminFeedbackHandler(db, feedbackRepo, auditLogger)

	r := gin.New()
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.StructuredLogging(logger))
	r.Use(gin.Recovery())
	r.Use(middleware.NewCORS(cfg.CORS))

	// Health check (used by Railway and load balancers)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"service":   "liferise-admin-api",
			"version":   "1.0.0",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	v1 := r.Group("/api")
	{
		v1.POST("/login", authHandler.Login)
		v1.POST("/refresh-token", authHandler.RefreshToken)

		authRequired := v1.Group("")
		authRequired.Use(middleware.RequireAuth(jwtService))
		authRequired.Use(middleware.RequireRole(
			string(auth.RoleSuperAdmin),
			string(auth.RoleSales),
			string(auth.RolePMO),
			string(auth.RoleComplexManager),
		))
		{
			authRequired.GET("/profile", authHandler.Profile)
			authRequired.POST("/logout", authHandler.Logout)

			authRequired.GET("/bookings", bookingHandler.List)
			authRequired.GET("/bookings/:id", bookingHandler.Get)
			authRequired.PATCH("/bookings/:id/status", bookingHandler.UpdateStatus)

			authRequired.GET("/services", serviceHandler.List)
			authRequired.POST("/services", serviceHandler.Create)
			authRequired.PATCH("/services/:id", serviceHandler.Update)
			authRequired.DELETE("/services/:id", serviceHandler.Delete)

			authRequired.GET("/payments/:id", paymentHandler.GetPayment)
			authRequired.POST("/payments/:id/refund", paymentHandler.Refund)
		}

		adapterhttp.RegisterAdminRoutes(v1, jwtService, &adapterhttp.AdminHandlers{
			Dashboard:     adminDashHandler,
			User:          adminUserHandler,
			Company:       adminCompanyHandler,
			Role:          adminRoleHandler,
			Announcement:  adminAnnouncementHandler,
			Banner:        adminBannerHandler,
			FAQ:           adminFAQHandler,
			Event:         adminEventHandler,
			EventBooking:  adminEventBookingHandler,
			EventResponse: adminEventResponseHandler,
			Location:      adminLocationHandler,
			Service:       adminServiceHandler,
			Support:       adminSupportHandler,
			Waitlist:      adminWaitlistHandler,
			Booking:       adminBookingHandler,
			Customer:      adminCustomerHandler,
			Feedback:      adminFeedbackHandler,
		})
	}

	port := cfg.Server.Port
	if port == 8080 && os.Getenv("PORT") == "" {
		port = 8082 // default admin-api port when running locally
	}
	// If PORT is set by the platform (e.g. Railway), it is already
	// injected into cfg.Server.Port by config.Load().

	srv := &nethttp.Server{
		Addr:         fmt.Sprintf("%s:%d", cfg.Server.Host, port),
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	go func() {
		logger.Info("starting admin API server", zap.String("addr", srv.Addr))
		if err := srv.ListenAndServe(); err != nil && err != nethttp.ErrServerClosed {
			logger.Fatal("server failed to start", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("shutting down admin API server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("server forced to shutdown", zap.Error(err))
	}
	logger.Info("admin API server exited gracefully")
}
