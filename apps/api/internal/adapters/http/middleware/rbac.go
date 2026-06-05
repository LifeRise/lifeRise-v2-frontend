package middleware

import (
	"net/http"
	"slices"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"

	"github.com/liferise/backend/pkg/auth"
	"github.com/liferise/backend/pkg/response"
)

const (
	ClaimsKey    = "claims"
	UserIDKey    = "user_id"
	UserTypeKey  = "user_type"
	CompanyIDKey = "company_id"
)

// RequireAuth validates the JWT access token and injects claims into the Gin context.
func RequireAuth(jwtService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			zap.L().Warn("[RequireAuth] missing Authorization header",
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.String("client_ip", c.ClientIP()))
			response.Error(c, http.StatusUnauthorized, "Unauthorized", nil)
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			zap.L().Warn("[RequireAuth] invalid Authorization header format",
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.String("header", authHeader))
			response.Error(c, http.StatusUnauthorized, "Unauthorized", nil)
			c.Abort()
			return
		}

		claims, err := jwtService.ValidateToken(parts[1])
		if err != nil {
			zap.L().Warn("[RequireAuth] token validation failed",
				zap.String("path", c.Request.URL.Path),
				zap.String("method", c.Request.Method),
				zap.String("error", err.Error()),
				zap.String("token_preview", parts[1][:min(30, len(parts[1]))]))
			response.Error(c, http.StatusUnauthorized, "Unauthorized", nil)
			c.Abort()
			return
		}

		zap.L().Debug("[RequireAuth] token validated",
			zap.Uint64("user_id", claims.UserID),
			zap.String("user_type", claims.UserType),
			zap.Strings("roles", claims.Roles))

		c.Set(ClaimsKey, claims)
		c.Set(UserIDKey, claims.UserID)
		c.Set(UserTypeKey, claims.UserType)
		c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// RequireRole allows access if the authenticated principal has ANY of the specified global roles.
func RequireRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get(ClaimsKey)
		if !exists {
			response.Error(c, http.StatusUnauthorized, "Unauthorized", nil)
			c.Abort()
			return
		}

		claims := claimsVal.(*auth.Claims)
		for _, role := range claims.Roles {
			if slices.Contains(allowedRoles, role) {
				c.Next()
				return
			}
		}

		response.Error(c, http.StatusForbidden, "Forbidden: insufficient permissions", nil)
		c.Abort()
	}
}

// RequireCompanyScopedRole enforces company-scoped RBAC.
// A user can hold different roles for different companies simultaneously.
// If the route contains a :company_id parameter, the role must be scoped to that company (or be global).
func RequireCompanyScopedRole(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get(ClaimsKey)
		if !exists {
			response.Error(c, http.StatusUnauthorized, "Unauthorized", nil)
			c.Abort()
			return
		}

		claims := claimsVal.(*auth.Claims)
		requestedCompanyID := extractCompanyIDFromPath(c)

		for _, assignment := range claims.RoleAssignments {
			if !slices.Contains(allowedRoles, assignment.Role) {
				continue
			}

			// Global role (nil CompanyID) grants access to any company context
			if assignment.CompanyID == nil {
				c.Set(CompanyIDKey, requestedCompanyID)
				c.Next()
				return
			}

			// If no company is specified in the path, any scoped role is acceptable
			if requestedCompanyID == nil {
				c.Set(CompanyIDKey, *assignment.CompanyID)
				c.Next()
				return
			}

			// Company-scoped role must match the requested company
			if *assignment.CompanyID == *requestedCompanyID {
				c.Set(CompanyIDKey, *assignment.CompanyID)
				c.Next()
				return
			}
		}

		response.Error(c, http.StatusForbidden, "Forbidden: insufficient company permissions", nil)
		c.Abort()
	}
}

// RequirePermission checks if the authenticated principal has a specific permission.
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		claimsVal, exists := c.Get(ClaimsKey)
		if !exists {
			response.Error(c, http.StatusUnauthorized, "Unauthorized", nil)
			c.Abort()
			return
		}

		claims := claimsVal.(*auth.Claims)
		if !slices.Contains(claims.Permissions, permission) {
			response.Error(c, http.StatusForbidden, "Forbidden: missing required permission", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// OptionalAuth attempts to parse the JWT but does not abort on failure.
func OptionalAuth(jwtService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.Next()
			return
		}

		claims, err := jwtService.ValidateToken(parts[1])
		if err != nil {
			c.Next()
			return
		}

		c.Set(ClaimsKey, claims)
		c.Set(UserIDKey, claims.UserID)
		c.Set(UserTypeKey, claims.UserType)
		c.Next()
	}
}

// extractCompanyIDFromPath attempts to read :company_id or :id from the Gin path.
func extractCompanyIDFromPath(c *gin.Context) *uint64 {
	for _, param := range []string{"company_id", "companyId", "id"} {
		val := c.Param(param)
		if val == "" {
			continue
		}
		id, err := strconv.ParseUint(val, 10, 64)
		if err != nil {
			continue
		}
		return &id
	}
	return nil
}

// ExtractClaims retrieves parsed claims from the Gin context.
func ExtractClaims(c *gin.Context) *auth.Claims {
	val, exists := c.Get(ClaimsKey)
	if !exists {
		return nil
	}
	claims, ok := val.(*auth.Claims)
	if !ok {
		return nil
	}
	return claims
}
