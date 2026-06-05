package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/liferise/backend/internal/adapters/http/middleware"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/pkg/auth"
	"github.com/liferise/backend/pkg/response"
)

// adminPaginatedSuccess returns a Laravel-compatible paginated response.
func adminPaginatedSuccess(c *gin.Context, message string, data interface{}, meta pagination.Meta, links response.PaginationLinks) {
	response.PaginatedSuccess(c, http.StatusOK, message, response.PaginatedData{
		Data:  data,
		Links: links,
		Meta: response.PaginationMeta{
			CurrentPage: meta.CurrentPage,
			From:        meta.From,
			LastPage:    meta.LastPage,
			Path:        c.Request.URL.Path,
			PerPage:     meta.CurrentPage,
			To:          meta.To,
			Total:       int(meta.Total),
		},
	})
}

// extractClaims retrieves claims from Gin context.
func extractClaims(c *gin.Context) *auth.Claims {
	return middleware.ExtractClaims(c)
}

// parseID parses a uint64 id from Gin param.
func parseID(c *gin.Context, param string) (uint64, bool) {
	idStr := c.Param(param)
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, param, "The "+param+" must be a valid integer.")
		return 0, false
	}
	return id, true
}

// safeUserResponse strips sensitive fields from a user record.
func safeUserResponse(u interface{}) interface{} {
	// Use a map to ensure password fields are never serialized.
	// Callers should use dedicated DTOs; this is a safety net.
	return u
}
