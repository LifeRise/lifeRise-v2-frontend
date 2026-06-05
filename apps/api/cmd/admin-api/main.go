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
	appbooking "github.com/liferise/backend/internal/application/booking"
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

	authHandler := handlers.NewAuthHandler(authUC, cfg.App.URL)
	bookingHandler := handlers.NewBookingHandler(bookingUC)
	paymentHandler := handlers.NewPaymentHandler(stripeUC, cfg.Stripe.WebhookSecret)
	serviceHandler := handlers.NewServiceHandler(serviceUC)

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
