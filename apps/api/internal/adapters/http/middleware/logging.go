package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// RequestIDHeader is the header used to propagate request IDs.
const RequestIDHeader = "X-Request-ID"

// StructuredLogging injects a request-scoped logger and records access logs.
func StructuredLogging(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		// Generate or propagate request ID
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("request_id", requestID)
		c.Header(RequestIDHeader, requestID)

		// Create request-scoped logger
		reqLogger := logger.With(
			zap.String("request_id", requestID),
			zap.String("client_ip", c.ClientIP()),
			zap.String("method", c.Request.Method),
			zap.String("path", path),
		)
		c.Set("logger", reqLogger)

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		size := c.Writer.Size()

		fields := []zap.Field{
			zap.Int("status", status),
			zap.Duration("latency", latency),
			zap.Int("body_size", size),
			zap.String("user_agent", c.Request.UserAgent()),
		}

		if raw != "" {
			fields = append(fields, zap.String("query", raw))
		}

		if len(c.Errors) > 0 {
			fields = append(fields, zap.Strings("errors", c.Errors.Errors()))
		}

		if status >= 500 {
			reqLogger.Error("Server error", fields...)
		} else if status >= 400 {
			reqLogger.Warn("Client error", fields...)
		} else {
			reqLogger.Info("Request completed", fields...)
		}
	}
}
