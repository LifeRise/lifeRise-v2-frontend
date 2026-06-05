package http

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/liferise/backend/internal/adapters/http/handlers"
	"github.com/liferise/backend/internal/adapters/http/middleware"
	"github.com/liferise/backend/pkg/auth"
)

// ServerConfig holds dependencies for route registration.
type ServerConfig struct {
	JWTService          *auth.Service
	AuthHandler         *handlers.AuthHandler
	BookingHandler      *handlers.BookingHandler
	PaymentHandler      *handlers.PaymentHandler
	ServiceHandler      *handlers.ServiceHandler
	FavoriteHandler     *handlers.FavoriteHandler
	NotificationHandler *handlers.NotificationHandler
}

// RegisterRoutes sets up all API routes.
func RegisterRoutes(r *gin.Engine, cfg *ServerConfig) {
	// Global middleware
	r.Use(middleware.TimezoneMiddleware())

	// Swagger UI (loads spec from /docs/swagger.yaml)
	r.StaticFile("/docs/swagger.yaml", "./docs/swagger.yaml")
	r.GET("/api/documentation", func(c *gin.Context) {
		c.Header("Content-Type", "text/html")
		c.String(200, `<!DOCTYPE html>
<html>
<head>
  <title>LifeRise API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/swagger.yaml',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.presets.standalone],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`)
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "ok",
			"service":   "liferise-api",
			"version":   "1.0.0",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// API v1 routes
	api := r.Group("/api")
	{
		// Public routes
		api.POST("/signup", cfg.AuthHandler.Register)
		api.POST("/vendor/signup", cfg.AuthHandler.RegisterVendor)
		api.POST("/login", cfg.AuthHandler.Login)
		api.POST("/forgot-password", cfg.AuthHandler.ForgotPassword)
		api.POST("/reset-password", cfg.AuthHandler.ResetPassword)
		api.POST("/refresh-token", cfg.AuthHandler.RefreshToken)

		// Public catalog
		api.GET("/services", cfg.ServiceHandler.List)
		api.GET("/services/:id", cfg.ServiceHandler.Get)
		api.GET("/services/:id/slots", cfg.ServiceHandler.GetSlots)

		// Authenticated routes
		authRequired := api.Group("")
		authRequired.Use(middleware.RequireAuth(cfg.JWTService))
		{
			authRequired.GET("/profile", cfg.AuthHandler.Profile)
			authRequired.POST("/logout", cfg.AuthHandler.Logout)

			// Bookings
			authRequired.GET("/bookings", cfg.BookingHandler.List)
			authRequired.POST("/bookings", cfg.BookingHandler.Create)
			authRequired.GET("/bookings/:id", cfg.BookingHandler.Get)
			authRequired.PATCH("/bookings/:id/status", cfg.BookingHandler.UpdateStatus)
			authRequired.POST("/bookings/:id/reschedule", cfg.BookingHandler.Reschedule)

			// Payments
			authRequired.POST("/payments/intent", cfg.PaymentHandler.CreatePaymentIntent)
			authRequired.POST("/payments/intent/:id/confirm", cfg.PaymentHandler.ConfirmPaymentIntent)
			authRequired.GET("/payments/:id", cfg.PaymentHandler.GetPayment)
			authRequired.POST("/payments/:id/refund", cfg.PaymentHandler.Refund)
			authRequired.POST("/payments/release/:booking_id", cfg.PaymentHandler.ReleasePayment)

			// Favorites
			authRequired.GET("/favorites", cfg.FavoriteHandler.List)
			authRequired.POST("/favorites/toggle", cfg.FavoriteHandler.Toggle)
			authRequired.DELETE("/favorites/:id", cfg.FavoriteHandler.Delete)
		}

		// Notifications (authenticated)
		authRequired.POST("/notifications/email", cfg.NotificationHandler.SendEmail)
		authRequired.POST("/notifications/push", cfg.NotificationHandler.SendPush)
		authRequired.POST("/notifications/booking-confirmation", cfg.NotificationHandler.SendBookingConfirmation)

		// Admin / Vendor scoped routes
		adminScoped := api.Group("")
		adminScoped.Use(
			middleware.RequireAuth(cfg.JWTService),
			middleware.RequireCompanyScopedRole(
				string(auth.RoleSuperAdmin),
				string(auth.RoleComplexManager),
				string(auth.RoleCompanyStaff),
				string(auth.RoleServiceProvider),
			),
		)
		{
			adminScoped.POST("/services", cfg.ServiceHandler.Create)
			adminScoped.PATCH("/services/:id", cfg.ServiceHandler.Update)
			adminScoped.DELETE("/services/:id", cfg.ServiceHandler.Delete)
		}
	}

	// Stripe webhook (public, signature verified internally)
	r.POST("/webhooks/stripe", cfg.PaymentHandler.Webhook)
}
