package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/liferise/backend/internal/adapters/http/middleware"
	appdashboard "github.com/liferise/backend/internal/application/dashboard"
	"github.com/liferise/backend/internal/domain/dashboard"
	"github.com/liferise/backend/pkg/auth"
	"github.com/liferise/backend/pkg/response"
)

// AdminDashboardHandler handles admin dashboard endpoints.
type AdminDashboardHandler struct {
	uc *appdashboard.OverviewUseCase
}

// NewAdminDashboardHandler creates a new AdminDashboardHandler.
func NewAdminDashboardHandler(uc *appdashboard.OverviewUseCase) *AdminDashboardHandler {
	return &AdminDashboardHandler{uc: uc}
}

// Overview returns the full dashboard overview for the authenticated manager/admin.
func (h *AdminDashboardHandler) Overview(c *gin.Context) {
	scope, err := resolveOverviewScope(c)
	if err != nil {
		if errors.Is(err, errForbidden) {
			response.Error(c, http.StatusForbidden, "Forbidden: complex_manager requires a company assignment.", nil)
			return
		}
		if errors.Is(err, errInvalidCompanyID) {
			response.ValidationErrorSingle(c, "company_id", "The company_id must be a valid integer.")
			return
		}
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}

	overview, err := h.uc.GetOverview(c.Request.Context(), *scope)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load dashboard overview.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Dashboard overview retrieved.", overview)
}

var (
	errForbidden        = errors.New("forbidden: complex_manager requires company_id")
	errInvalidCompanyID = errors.New("invalid company_id")
)

// resolveOverviewScope builds the scope from JWT claims and optional query params.
// Global roles (admin, sales, pmo) may pass an explicit ?company_id to scope the view.
// Complex managers are implicitly scoped to their assigned company.
func resolveOverviewScope(c *gin.Context) (*dashboard.OverviewScope, error) {
	claims := middleware.ExtractClaims(c)
	if claims == nil {
		return nil, errors.New("missing claims")
	}

	hasGlobalRole := false
	isComplexManager := false
	for _, r := range claims.Roles {
		switch r {
		case string(auth.RoleSuperAdmin), string(auth.RoleSales), string(auth.RolePMO):
			hasGlobalRole = true
		case string(auth.RoleComplexManager):
			isComplexManager = true
		}
	}

	now := time.Now().UTC()

	// Global roles may optionally scope to a company via query param.
	if hasGlobalRole {
		companyIDStr := c.Query("company_id")
		if companyIDStr != "" {
			id, err := strconv.ParseUint(companyIDStr, 10, 64)
			if err != nil {
				return nil, errInvalidCompanyID
			}
			return &dashboard.OverviewScope{CompanyID: &id, Now: now}, nil
		}
		return &dashboard.OverviewScope{Now: now}, nil
	}

	// Non-global users must be complex managers with a company assignment.
	if !isComplexManager {
		return nil, errForbidden
	}

	for _, a := range claims.RoleAssignments {
		if a.Role == string(auth.RoleComplexManager) && a.CompanyID != nil {
			return &dashboard.OverviewScope{CompanyID: a.CompanyID, Now: now}, nil
		}
	}

	return nil, errForbidden
}
