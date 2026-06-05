package middleware

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/liferise/backend/internal/infrastructure/config"
)

// NewCORS returns a Gin CORS middleware from config.
func NewCORS(cfg config.CORSConfig) gin.HandlerFunc {
	if !cfg.Enabled {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	maxAge := time.Duration(cfg.MaxAge) * time.Second
	if cfg.MaxAge <= 0 {
		maxAge = 24 * time.Hour
	}

	return cors.New(cors.Config{
		AllowOrigins:     cfg.AllowOrigins,
		AllowMethods:     cfg.AllowMethods,
		AllowHeaders:     cfg.AllowHeaders,
		ExposeHeaders:    cfg.ExposeHeaders,
		AllowCredentials: cfg.AllowCredentials,
		MaxAge:           maxAge,
	})
}
