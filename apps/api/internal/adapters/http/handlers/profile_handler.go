package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/liferise/backend/internal/adapters/http/middleware"
	"github.com/liferise/backend/pkg/auth"
	"github.com/liferise/backend/pkg/response"
)

// ProfileResponse is the unified profile shape returned to the frontend.
type ProfileResponse struct {
	ID        uint64   `json:"id"`
	Email     string   `json:"email"`
	FirstName string   `json:"first_name"`
	LastName  string   `json:"last_name"`
	Phone     string   `json:"phone"`
	Avatar    *string  `json:"avatar,omitempty"`
	Timezone  string   `json:"timezone"`
	Status    string   `json:"status"`
	Role      string   `json:"role"`      // frontend-friendly role: resident | vendor | manager
	UserType  string   `json:"user_type"` // backend user type: customer | user
	Roles     []string `json:"roles"`     // all backend roles
	CreatedAt string   `json:"created_at"`
}

// Profile returns the authenticated user's profile.
func (h *AuthHandler) Profile(c *gin.Context) {
	claims := middleware.ExtractClaims(c)
	if claims == nil {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}

	ctx := c.Request.Context()

	// Customer path
	if claims.UserType == "customer" {
		customer, err := h.authUC.GetCustomerProfile(ctx, claims.UserID)
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "Failed to load profile.", nil)
			return
		}

		avatar := customer.Avatar
		response.Success(c, http.StatusOK, "Profile retrieved.", ProfileResponse{
			ID:        customer.ID,
			Email:     customer.Email,
			FirstName: customer.FirstName,
			LastName:  customer.LastName,
			Phone:     customer.Phone,
			Avatar:    avatar,
			Timezone:  customer.Timezone,
			Status:    customer.Status,
			Role:      mapBackendRoleToFrontend("customer", claims.Roles),
			UserType:  "customer",
			Roles:     claims.Roles,
			CreatedAt: customer.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
		return
	}

	// User (admin/vendor/staff) path
	user, err := h.authUC.GetUserProfile(ctx, claims.UserID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load profile.", nil)
		return
	}

	avatar := user.Avatar
	response.Success(c, http.StatusOK, "Profile retrieved.", ProfileResponse{
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Phone:     user.Phone,
		Avatar:    avatar,
		Timezone:  user.Timezone,
		Status:    user.Status,
		Role:      mapBackendRoleToFrontend("user", claims.Roles),
		UserType:  "user",
		Roles:     claims.Roles,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// mapBackendRoleToFrontend converts backend role slugs to frontend roles.
func mapBackendRoleToFrontend(userType string, roles []string) string {
	// Check for admin first
	for _, r := range roles {
		if r == string(auth.RoleSuperAdmin) {
			return "admin"
		}
	}

	// Check for manager roles
	managerRoles := map[string]bool{
		string(auth.RoleSales):          true,
		string(auth.RolePMO):            true,
		string(auth.RoleComplexManager): true,
	}
	for _, r := range roles {
		if managerRoles[r] {
			return "manager"
		}
	}

	// Check for vendor
	for _, r := range roles {
		if r == string(auth.RoleServiceProvider) {
			return "vendor"
		}
	}

	// Default to resident for customers
	if userType == "customer" {
		return "resident"
	}

	return "resident"
}
