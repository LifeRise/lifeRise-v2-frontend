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
	"go.uber.org/zap"

	handlers "github.com/liferise/backend/internal/adapters/http/handlers"
	"github.com/liferise/backend/internal/adapters/http/middleware"
	stripeAdapter "github.com/liferise/backend/internal/adapters/stripe"
	appaudit "github.com/liferise/backend/internal/application/audit"
	appbooking "github.com/liferise/backend/internal/application/booking"
	appdashboard "github.com/liferise/backend/internal/application/dashboard"
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

	authHandler := handlers.NewAuthHandler(authUC, cfg.App.URL)
	bookingHandler := handlers.NewBookingHandler(bookingUC)
	paymentHandler := handlers.NewPaymentHandler(stripeUC, cfg.Stripe.WebhookSecret)
	serviceHandler := handlers.NewServiceHandler(serviceUC)
	adminDashHandler := handlers.NewAdminDashboardHandler(dashboardUC)
	adminUserHandler := handlers.NewAdminUserHandler(db, userRepo, auditLogger, jwtService)
	adminCompanyHandler := handlers.NewAdminCompanyHandler(db, companyRepo, auditLogger)
	adminRoleHandler := handlers.NewAdminRoleHandler(db, userRepo, auditLogger)
	adminAnnouncementHandler := handlers.NewAdminAnnouncementHandler(db, announcementRepo, auditLogger)
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

			authRequired.GET("/admin/dashboard/overview", adminDashHandler.Overview)

			// Admin CRUD routes
			authRequired.GET("/admin/users", adminUserHandler.List)
			authRequired.GET("/admin/users/:id", adminUserHandler.Get)
			authRequired.POST("/admin/users", adminUserHandler.Create)
			authRequired.PATCH("/admin/users/:id", adminUserHandler.Update)
			authRequired.DELETE("/admin/users/:id", adminUserHandler.Delete)
			authRequired.POST("/admin/users/:id/reset-password", adminUserHandler.ResetPassword)
			authRequired.POST("/admin/users/:id/impersonate", adminUserHandler.Impersonate)

			authRequired.GET("/admin/companies", adminCompanyHandler.List)
			authRequired.GET("/admin/companies/:id", adminCompanyHandler.Get)
			authRequired.POST("/admin/companies", adminCompanyHandler.Create)
			authRequired.PATCH("/admin/companies/:id", adminCompanyHandler.Update)
			authRequired.DELETE("/admin/companies/:id", adminCompanyHandler.Delete)
			authRequired.POST("/admin/companies/:id/verify", adminCompanyHandler.Verify)

			authRequired.GET("/admin/roles", adminRoleHandler.List)
			authRequired.GET("/admin/roles/:id", adminRoleHandler.Get)
			authRequired.POST("/admin/roles", adminRoleHandler.Create)
			authRequired.PATCH("/admin/roles/:id", adminRoleHandler.Update)
			authRequired.DELETE("/admin/roles/:id", adminRoleHandler.Delete)
			authRequired.GET("/admin/roles/:id/permissions", adminRoleHandler.GetPermissions)
			authRequired.PUT("/admin/roles/:id/permissions", adminRoleHandler.UpdatePermissions)

			authRequired.GET("/admin/announcements", adminAnnouncementHandler.List)
			authRequired.GET("/admin/announcements/:id", adminAnnouncementHandler.Get)
			authRequired.POST("/admin/announcements", adminAnnouncementHandler.Create)
			authRequired.PATCH("/admin/announcements/:id", adminAnnouncementHandler.Update)
			authRequired.DELETE("/admin/announcements/:id", adminAnnouncementHandler.Delete)

			authRequired.GET("/admin/app-banners", adminBannerHandler.List)
			authRequired.GET("/admin/app-banners/:id", adminBannerHandler.Get)
			authRequired.POST("/admin/app-banners", adminBannerHandler.Create)
			authRequired.PATCH("/admin/app-banners/:id", adminBannerHandler.Update)
			authRequired.DELETE("/admin/app-banners/:id", adminBannerHandler.Delete)

			authRequired.GET("/admin/faqs", adminFAQHandler.List)
			authRequired.GET("/admin/faqs/:id", adminFAQHandler.Get)
			authRequired.POST("/admin/faqs", adminFAQHandler.Create)
			authRequired.PATCH("/admin/faqs/:id", adminFAQHandler.Update)
			authRequired.DELETE("/admin/faqs/:id", adminFAQHandler.Delete)

			authRequired.GET("/admin/group-events", adminEventHandler.List)
			authRequired.GET("/admin/group-events/:id", adminEventHandler.Get)
			authRequired.POST("/admin/group-events", adminEventHandler.Create)
			authRequired.PATCH("/admin/group-events/:id", adminEventHandler.Update)
			authRequired.DELETE("/admin/group-events/:id", adminEventHandler.Delete)

			authRequired.GET("/admin/event-bookings", adminEventBookingHandler.ListEventBookings)
			authRequired.GET("/admin/event-bookings/:id", adminEventBookingHandler.GetEventBooking)
			authRequired.POST("/admin/event-bookings", adminEventBookingHandler.CreateEventBooking)
			authRequired.PATCH("/admin/event-bookings/:id", adminEventBookingHandler.UpdateEventBooking)
			authRequired.DELETE("/admin/event-bookings/:id", adminEventBookingHandler.DeleteEventBooking)

			authRequired.GET("/admin/event-responses", adminEventResponseHandler.ListEventResponses)
			authRequired.GET("/admin/event-responses/:id", adminEventResponseHandler.GetEventResponse)
			authRequired.POST("/admin/event-responses", adminEventResponseHandler.CreateEventResponse)
			authRequired.PATCH("/admin/event-responses/:id", adminEventResponseHandler.UpdateEventResponse)
			authRequired.DELETE("/admin/event-responses/:id", adminEventResponseHandler.DeleteEventResponse)

			authRequired.GET("/admin/locations", adminLocationHandler.List)
			authRequired.GET("/admin/locations/:id", adminLocationHandler.Get)
			authRequired.POST("/admin/locations", adminLocationHandler.Create)
			authRequired.PATCH("/admin/locations/:id", adminLocationHandler.Update)
			authRequired.DELETE("/admin/locations/:id", adminLocationHandler.Delete)

			authRequired.GET("/admin/services", adminServiceHandler.List)
			authRequired.GET("/admin/services/:id", adminServiceHandler.Get)
			authRequired.POST("/admin/services", adminServiceHandler.Create)
			authRequired.PATCH("/admin/services/:id", adminServiceHandler.Update)
			authRequired.DELETE("/admin/services/:id", adminServiceHandler.Delete)

			authRequired.GET("/admin/service-categories", adminServiceHandler.ListCategories)
			authRequired.GET("/admin/service-categories/:id", adminServiceHandler.GetCategory)
			authRequired.POST("/admin/service-categories", adminServiceHandler.CreateCategory)
			authRequired.PATCH("/admin/service-categories/:id", adminServiceHandler.UpdateCategory)
			authRequired.DELETE("/admin/service-categories/:id", adminServiceHandler.DeleteCategory)

			authRequired.GET("/admin/support", adminSupportHandler.List)
			authRequired.GET("/admin/support/:id", adminSupportHandler.Get)
			authRequired.POST("/admin/support", adminSupportHandler.Create)
			authRequired.PATCH("/admin/support/:id", adminSupportHandler.Update)
			authRequired.DELETE("/admin/support/:id", adminSupportHandler.Delete)
			authRequired.POST("/admin/support/:id/messages", adminSupportHandler.CreateMessage)

			authRequired.GET("/admin/waitlists", adminWaitlistHandler.List)
			authRequired.GET("/admin/waitlists/:id", adminWaitlistHandler.Get)
			authRequired.POST("/admin/waitlists", adminWaitlistHandler.Create)
			authRequired.PATCH("/admin/waitlists/:id", adminWaitlistHandler.Update)
			authRequired.DELETE("/admin/waitlists/:id", adminWaitlistHandler.Delete)

			authRequired.GET("/admin/bookings", adminBookingHandler.List)
			authRequired.GET("/admin/bookings/:id", adminBookingHandler.Get)
			authRequired.PATCH("/admin/bookings/:id", adminBookingHandler.Update)
			authRequired.DELETE("/admin/bookings/:id", adminBookingHandler.Delete)

			authRequired.GET("/admin/customers", adminCustomerHandler.List)
			authRequired.GET("/admin/customers/:id", adminCustomerHandler.Get)
			authRequired.POST("/admin/customers", adminCustomerHandler.Create)
			authRequired.PATCH("/admin/customers/:id", adminCustomerHandler.Update)
			authRequired.DELETE("/admin/customers/:id", adminCustomerHandler.Delete)

			authRequired.GET("/admin/feedbacks", adminFeedbackHandler.List)
			authRequired.GET("/admin/feedbacks/:id", adminFeedbackHandler.Get)
			authRequired.PATCH("/admin/feedbacks/:id", adminFeedbackHandler.Update)
			authRequired.DELETE("/admin/feedbacks/:id", adminFeedbackHandler.Delete)
		}
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
