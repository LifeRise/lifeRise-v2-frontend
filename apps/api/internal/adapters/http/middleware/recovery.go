package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/liferise/backend/pkg/response"
	"go.uber.org/zap"
)

// Recovery catches panics, logs stack traces, and returns a 500 JSON response
// compatible with Laravel's generic error shape.
func Recovery(logger *zap.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if rec := recover(); rec != nil {
				stack := debug.Stack()
				logger.Error("panic recovered",
					zap.Any("error", rec),
					zap.String("stack", string(stack)),
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
				)

				response.Error(c, http.StatusInternalServerError,
					"An internal server error occurred.", nil)
				c.Abort()
			}
		}()
		c.Next()
	}
}

// NotFound returns a Laravel-compatible 404 JSON response for unmatched routes.
func NotFound() gin.HandlerFunc {
	return func(c *gin.Context) {
		response.Error(c, http.StatusNotFound,
			fmt.Sprintf("The route %s %s could not be found.", c.Request.Method, c.Request.URL.Path),
			nil)
	}
}
