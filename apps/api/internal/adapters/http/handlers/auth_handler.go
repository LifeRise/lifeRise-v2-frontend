package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	appuser "github.com/liferise/backend/internal/application/user"
	"github.com/liferise/backend/pkg/auth"
	apperrors "github.com/liferise/backend/pkg/errors"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	authUC *appuser.AuthUseCase
	appURL string
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(authUC *appuser.AuthUseCase, appURL string) *AuthHandler {
	return &AuthHandler{authUC: authUC, appURL: appURL}
}

// RegisterRequest mirrors Laravel's registration validation rules.
type RegisterRequest struct {
	FirstName string `json:"first_name" validate:"required,max=255"`
	LastName  string `json:"last_name" validate:"required,max=255"`
	Email     string `json:"email" validate:"required,email,max=255"`
	Phone     string `json:"phone" validate:"required,max=50"`
	Password  string `json:"password" validate:"required,min=8,max=255"`
	Timezone  string `json:"timezone,omitempty" validate:"omitempty,max=100"`
}

// Register handles customer registration.
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	customer, err := h.authUC.RegisterCustomer(c.Request.Context(), appuser.RegisterCustomerRequest{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Phone:     req.Phone,
		Password:  req.Password,
		Timezone:  req.Timezone,
	})
	if err != nil {
		if errors.Is(err, apperrors.ErrConflict) {
			response.Error(c, http.StatusConflict, "The email has already been taken.", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Registration failed.", nil)
		return
	}

	response.Success(c, http.StatusCreated, "User registered successfully.", gin.H{
		"id":    customer.ID,
		"email": customer.Email,
	})
}

// VendorRegisterRequest mirrors vendor registration validation rules.
type VendorRegisterRequest struct {
	FirstName   string `json:"first_name" validate:"required,max=255"`
	LastName    string `json:"last_name" validate:"required,max=255"`
	Email       string `json:"email" validate:"required,email,max=255"`
	Phone       string `json:"phone" validate:"required,max=50"`
	Password    string `json:"password" validate:"required,min=8,max=255"`
	Timezone    string `json:"timezone,omitempty" validate:"omitempty,max=100"`
	EINTaxID    string `json:"ein_tax_id" validate:"required,max=50"`
	Description string `json:"description" validate:"required"`
}

// ManagerRegisterRequest mirrors manager registration validation rules.
type ManagerRegisterRequest struct {
	FirstName string `json:"first_name" validate:"required,max=255"`
	LastName  string `json:"last_name" validate:"required,max=255"`
	Email     string `json:"email" validate:"required,email,max=255"`
	Phone     string `json:"phone" validate:"required,max=50"`
	Password  string `json:"password" validate:"required,min=8,max=255"`
	Timezone  string `json:"timezone,omitempty" validate:"omitempty,max=100"`
}

// RegisterManager handles manager registration.
func (h *AuthHandler) RegisterManager(c *gin.Context) {
	var req ManagerRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	u, err := h.authUC.RegisterManager(c.Request.Context(), appuser.RegisterManagerRequest{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Phone:     req.Phone,
		Password:  req.Password,
		Timezone:  req.Timezone,
	})
	if err != nil {
		if errors.Is(err, apperrors.ErrConflict) {
			response.Error(c, http.StatusConflict, "The email has already been taken.", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Registration failed.", nil)
		return
	}

	response.Success(c, http.StatusCreated, "Manager registered successfully.", gin.H{
		"id":    u.ID,
		"email": u.Email,
		"role":  "manager",
	})
}

// RegisterVendor handles vendor registration.
func (h *AuthHandler) RegisterVendor(c *gin.Context) {
	var req VendorRegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	u, err := h.authUC.RegisterVendor(c.Request.Context(), appuser.RegisterVendorRequest{
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Email:       req.Email,
		Phone:       req.Phone,
		Password:    req.Password,
		Timezone:    req.Timezone,
		EINTaxID:    req.EINTaxID,
		Description: req.Description,
	})
	if err != nil {
		if errors.Is(err, apperrors.ErrConflict) {
			response.Error(c, http.StatusConflict, "The email has already been taken.", nil)
			return
		}
		response.Error(c, http.StatusInternalServerError, "Registration failed.", nil)
		return
	}

	response.Success(c, http.StatusCreated, "Vendor registered successfully.", gin.H{
		"id":     u.ID,
		"email":  u.Email,
		"status": "pending_approval",
	})
}

// LoginRequest mirrors Laravel's login validation.
// When SupabaseAccessToken is provided, Password is ignored and the user is
// looked up by email after verifying the token with Supabase Auth.
type LoginRequest struct {
	Email               string `json:"email" validate:"omitempty,email"`
	Password            string `json:"password" validate:"omitempty"`
	SupabaseAccessToken string `json:"supabase_access_token,omitempty"`
}

// Login handles customer/user login.
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	var pair *auth.TokenPair
	var err error

	// If a Supabase access token is provided, verify it with Supabase Auth
	// and look up the user by email without checking the local password.
	if req.SupabaseAccessToken != "" {
		pair, _, err = h.authUC.LoginWithSupabaseToken(c.Request.Context(), req.SupabaseAccessToken)
		if err != nil {
			if errors.Is(err, apperrors.ErrInvalidCredentials) {
				response.Error(c, http.StatusUnauthorized, "Invalid credentials.", nil)
				return
			}
			response.Error(c, http.StatusInternalServerError, "Login failed.", nil)
			return
		}
	} else {
		// Legacy password-based login
		if req.Email == "" || req.Password == "" {
			response.ValidationError(c, map[string][]string{
				"email":    {"required"},
				"password": {"required"},
			})
			return
		}

		// Try customer login first
		pair, _, err = h.authUC.LoginCustomer(c.Request.Context(), appuser.LoginCustomerRequest{
			Email:    req.Email,
			Password: req.Password,
		})
		if err != nil {
			// Try user login as fallback
			pair, _, err = h.authUC.LoginUser(c.Request.Context(), appuser.LoginUserRequest{
				Email:    req.Email,
				Password: req.Password,
			})
			if err != nil {
				if errors.Is(err, apperrors.ErrInvalidCredentials) {
					response.Error(c, http.StatusUnauthorized, "Invalid credentials.", nil)
					return
				}
				response.Error(c, http.StatusInternalServerError, "Login failed.", nil)
				return
			}
		}
	}

	response.Success(c, http.StatusOK, "Login successful.", gin.H{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"expires_in":    pair.ExpiresIn,
		"token_type":    pair.TokenType,
	})
}

// Logout invalidates the current access token.
func (h *AuthHandler) Logout(c *gin.Context) {
	// TODO: implement token revocation (Redis blacklist)
	// For now, client-side token removal is sufficient
	response.Success(c, http.StatusOK, "Successfully logged out.", nil)
}

// RefreshToken exchanges a refresh token for a new access token.
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req struct {
		RefreshToken string `json:"refresh_token" validate:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	pair, err := h.authUC.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, "Invalid or expired refresh token.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Token refreshed.", gin.H{
		"access_token":  pair.AccessToken,
		"refresh_token": pair.RefreshToken,
		"expires_in":    pair.ExpiresIn,
		"token_type":    pair.TokenType,
	})
}

// ForgotPassword initiates password reset flow.
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" validate:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if err := h.authUC.ForgotPassword(c.Request.Context(), appuser.ForgotPasswordRequest{Email: req.Email}, h.appURL); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to send reset email.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Password reset link sent.", nil)
}

// ResetPassword completes password reset.
func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req struct {
		Token    string `json:"token" validate:"required"`
		Code     string `json:"code" validate:"required"`
		Password string `json:"password" validate:"required,min=8,max:255"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if err := h.authUC.ResetPassword(c.Request.Context(), appuser.ResetPasswordRequest{
		Token:    req.Token,
		Code:     req.Code,
		Password: req.Password,
	}); err != nil {
		msg := "Password reset failed."
		if errors.Is(err, apperrors.ErrInvalidCredentials) {
			msg = "Invalid or expired reset link."
		}
		response.Error(c, http.StatusUnauthorized, msg, nil)
		return
	}

	response.Success(c, http.StatusOK, "Password reset successfully.", nil)
}
