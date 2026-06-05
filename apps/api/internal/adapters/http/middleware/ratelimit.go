package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/liferise/backend/pkg/response"
	"github.com/redis/go-redis/v9"
)

// RateLimiter provides Redis-backed sliding window rate limiting.
type RateLimiter struct {
	redisClient *redis.Client
	maxRequests int
	window      time.Duration
	keyPrefix   string
}

// NewRateLimiter creates a rate limiter with the given constraints.
func NewRateLimiter(rdb *redis.Client, maxRequests int, window time.Duration, keyPrefix string) *RateLimiter {
	return &RateLimiter{
		redisClient: rdb,
		maxRequests: maxRequests,
		window:      window,
		keyPrefix:   keyPrefix,
	}
}

// Middleware returns a Gin middleware that enforces rate limiting per client IP.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		key := fmt.Sprintf("%s:%s", rl.keyPrefix, c.ClientIP())
		now := time.Now().UTC()
		windowStart := now.Add(-rl.window).Unix()

		pipe := rl.redisClient.Pipeline()
		// Remove old entries outside the window
		pipe.ZRemRangeByScore(c.Request.Context(), key, "0", fmt.Sprintf("%d", windowStart))
		// Count current entries
		countCmd := pipe.ZCard(c.Request.Context(), key)
		// Add current request
		pipe.ZAdd(c.Request.Context(), key, redis.Z{Score: float64(now.Unix()), Member: now.UnixNano()})
		// Set expiry on the key
		pipe.Expire(c.Request.Context(), key, rl.window)

		_, err := pipe.Exec(c.Request.Context())
		if err != nil {
			// Fail open on Redis errors to avoid blocking legitimate traffic
			c.Next()
			return
		}

		count := countCmd.Val()
		if count >= int64(rl.maxRequests) {
			response.Error(c, http.StatusTooManyRequests,
				"Too many requests. Please try again later.", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// PerUserRateLimiter returns a middleware that rate-limits by authenticated user ID.
func PerUserRateLimiter(rdb *redis.Client, maxRequests int, window time.Duration) gin.HandlerFunc {
	rl := NewRateLimiter(rdb, maxRequests, window, "ratelimit:user")
	return func(c *gin.Context) {
		userID, exists := c.Get(UserIDKey)
		if !exists {
			// Fall back to IP if not authenticated
			rl.Middleware()(c)
			return
		}

		key := fmt.Sprintf("%s:%v", rl.keyPrefix, userID)
		now := time.Now().UTC()
		windowStart := now.Add(-rl.window).Unix()

		pipe := rl.redisClient.Pipeline()
		pipe.ZRemRangeByScore(c.Request.Context(), key, "0", fmt.Sprintf("%d", windowStart))
		countCmd := pipe.ZCard(c.Request.Context(), key)
		pipe.ZAdd(c.Request.Context(), key, redis.Z{Score: float64(now.Unix()), Member: now.UnixNano()})
		pipe.Expire(c.Request.Context(), key, rl.window)

		_, err := pipe.Exec(c.Request.Context())
		if err != nil {
			c.Next()
			return
		}

		if countCmd.Val() >= int64(rl.maxRequests) {
			response.Error(c, http.StatusTooManyRequests,
				"Too many requests. Please try again later.", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}
