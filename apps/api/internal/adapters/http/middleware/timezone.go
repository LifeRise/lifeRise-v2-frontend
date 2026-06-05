package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
)

// TimezoneMiddleware sets the request timezone based on user profile or header.
// Default is UTC. The timezone is injected into the context for downstream use.
func TimezoneMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tz := "UTC"

		// Check for X-Timezone header from mobile apps
		if headerTz := c.GetHeader("X-Timezone"); headerTz != "" {
			if _, err := time.LoadLocation(headerTz); err == nil {
				tz = headerTz
			}
		}

		// Override with authenticated user's timezone if available
		if claims := ExtractClaims(c); claims != nil && claims.Timezone != "" {
			if _, err := time.LoadLocation(claims.Timezone); err == nil {
				tz = claims.Timezone
			}
		}

		c.Set("timezone", tz)
		c.Next()
	}
}

// GetTimezone extracts the timezone from the Gin context.
func GetTimezone(c *gin.Context) *time.Location {
	tzStr, exists := c.Get("timezone")
	if !exists {
		return time.UTC
	}

	loc, err := time.LoadLocation(tzStr.(string))
	if err != nil {
		return time.UTC
	}
	return loc
}
