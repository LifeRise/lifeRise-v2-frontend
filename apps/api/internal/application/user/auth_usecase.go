package user

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	appnotification "github.com/liferise/backend/internal/application/notification"
	"github.com/liferise/backend/internal/domain/customer"
	"github.com/liferise/backend/internal/domain/user"
	"github.com/liferise/backend/pkg/auth"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// AuthUseCase handles authentication flows for both Users and Customers.
type AuthUseCase struct {
	db              *gorm.DB
	userRepo        user.Repository
	customerRepo    customer.Repository
	jwtService      *auth.Service
	notificationUC  *appnotification.UseCase
	supabaseURL     string
	supabaseAnonKey string
}

// NewAuthUseCase creates a new AuthUseCase.
func NewAuthUseCase(
	db *gorm.DB,
	userRepo user.Repository,
	customerRepo customer.Repository,
	jwtService *auth.Service,
	notificationUC *appnotification.UseCase,
	supabaseURL string,
	supabaseAnonKey string,
) *AuthUseCase {
	return &AuthUseCase{
		db:              db,
		userRepo:        userRepo,
		customerRepo:    customerRepo,
		jwtService:      jwtService,
		notificationUC:  notificationUC,
		supabaseURL:     supabaseURL,
		supabaseAnonKey: supabaseAnonKey,
	}
}

// ── Customer Auth ──────────────────────────────────────────────

// RegisterCustomerRequest mirrors Laravel's customer registration.
type RegisterCustomerRequest struct {
	FirstName string `validate:"required,max=255"`
	LastName  string `validate:"required,max=255"`
	Email     string `validate:"required,email,max=255"`
	Phone     string `validate:"required,max=50"`
	Password  string `validate:"required,min=8,max=255"`
	Timezone  string
}

// RegisterCustomer creates a new customer account.
func (uc *AuthUseCase) RegisterCustomer(ctx context.Context, req RegisterCustomerRequest) (*customer.Customer, error) {
	// Normalize email to lowercase to ensure consistent lookup across all auth paths.
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check email uniqueness
	if _, err := uc.customerRepo.GetByEmail(ctx, uc.db, req.Email); err == nil {
		return nil, apperrors.ErrConflict
	}

	// Check phone uniqueness (if phone verification is enforced)
	if req.Phone != "" {
		if _, err := uc.customerRepo.GetByPhone(ctx, uc.db, req.Phone); err == nil {
			return nil, fmt.Errorf("phone already registered: %w", apperrors.ErrConflict)
		}
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	c := &customer.Customer{
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: hash,
		Timezone:     req.Timezone,
		Status:       "active",
	}
	if c.Timezone == "" {
		c.Timezone = "UTC"
	}

	if err := uc.customerRepo.Create(ctx, uc.db, c); err != nil {
		return nil, fmt.Errorf("create customer: %w", err)
	}

	return c, nil
}

// LoginCustomerRequest mirrors Laravel's login.
type LoginCustomerRequest struct {
	Email    string `validate:"required,email"`
	Password string `validate:"required"`
}

// LoginCustomer authenticates a customer and returns a JWT token pair.
func (uc *AuthUseCase) LoginCustomer(ctx context.Context, req LoginCustomerRequest) (*auth.TokenPair, *customer.Customer, error) {
	c, err := uc.customerRepo.GetByEmail(ctx, uc.db, req.Email)
	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			return nil, nil, apperrors.ErrInvalidCredentials
		}
		return nil, nil, err
	}

	if !auth.VerifyPassword(req.Password, c.PasswordHash) {
		return nil, nil, apperrors.ErrInvalidCredentials
	}

	// Update last login
	c.LastLoginAt = func() *time.Time { t := time.Now().UTC(); return &t }()
	_ = uc.customerRepo.Update(ctx, uc.db, c)

	claims := auth.Claims{
		UserID:   c.ID,
		UserType: "customer",
		Roles:    []string{string(auth.RoleCustomer)},
		Timezone: c.Timezone,
	}

	pair, err := uc.jwtService.GenerateTokenPair(claims)
	if err != nil {
		return nil, nil, fmt.Errorf("generate token pair: %w", err)
	}

	return pair, c, nil
}

// ── User (Admin/Vendor) Auth ───────────────────────────────────

// RegisterVendorRequest contains fields for vendor registration.
type RegisterVendorRequest struct {
	FirstName   string `validate:"required,max=255"`
	LastName    string `validate:"required,max=255"`
	Email       string `validate:"required,email,max=255"`
	Phone       string `validate:"required,max=50"`
	Password    string `validate:"required,min=8,max=255"`
	Timezone    string
	EINTaxID    string
	Description string
}

// RegisterVendor creates a new vendor user with service_provider role.
func (uc *AuthUseCase) RegisterVendor(ctx context.Context, req RegisterVendorRequest) (*user.User, error) {
	// Normalize email to lowercase to ensure consistent lookup across all auth paths.
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check email uniqueness
	if _, err := uc.userRepo.GetByEmail(ctx, uc.db, req.Email); err == nil {
		return nil, apperrors.ErrConflict
	}

	// Check phone uniqueness
	if req.Phone != "" {
		if _, err := uc.userRepo.GetByPhone(ctx, uc.db, req.Phone); err == nil {
			return nil, fmt.Errorf("phone already registered: %w", apperrors.ErrConflict)
		}
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	role, err := uc.userRepo.GetRoleBySlug(ctx, uc.db, "service_provider")
	if err != nil {
		return nil, fmt.Errorf("fetch service_provider role: %w", err)
	}

	settingsMap := map[string]any{
		"ein_tax_id":      req.EINTaxID,
		"description":     req.Description,
		"approval_status": "pending",
	}
	settingsBytes, err := json.Marshal(settingsMap)
	if err != nil {
		return nil, fmt.Errorf("marshal settings: %w", err)
	}

	u := &user.User{
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: hash,
		Timezone:     req.Timezone,
		Status:       "active",
		RoleID:       &role.ID,
		Settings:     datatypes.JSON(settingsBytes),
	}
	if u.Timezone == "" {
		u.Timezone = "UTC"
	}

	if err := uc.userRepo.Create(ctx, uc.db, u); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	assignment := &user.UserRoleAssignment{
		UserID:    u.ID,
		RoleID:    role.ID,
		CompanyID: nil,
	}
	if err := uc.userRepo.CreateRoleAssignment(ctx, uc.db, assignment); err != nil {
		return nil, fmt.Errorf("create role assignment: %w", err)
	}

	return u, nil
}

// RegisterManagerRequest contains fields for manager registration.
type RegisterManagerRequest struct {
	FirstName string `validate:"required,max=255"`
	LastName  string `validate:"required,max=255"`
	Email     string `validate:"required,email,max=255"`
	Phone     string `validate:"required,max=50"`
	Password  string `validate:"required,min=8,max=255"`
	Timezone  string
}

// RegisterManager creates a new manager user with complex_manager role.
func (uc *AuthUseCase) RegisterManager(ctx context.Context, req RegisterManagerRequest) (*user.User, error) {
	// Normalize email to lowercase to ensure consistent lookup across all auth paths.
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	// Check email uniqueness
	if _, err := uc.userRepo.GetByEmail(ctx, uc.db, req.Email); err == nil {
		return nil, apperrors.ErrConflict
	}

	// Check phone uniqueness
	if req.Phone != "" {
		if _, err := uc.userRepo.GetByPhone(ctx, uc.db, req.Phone); err == nil {
			return nil, fmt.Errorf("phone already registered: %w", apperrors.ErrConflict)
		}
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	role, err := uc.userRepo.GetRoleBySlug(ctx, uc.db, "complex_manager")
	if err != nil {
		return nil, fmt.Errorf("fetch complex_manager role: %w", err)
	}

	u := &user.User{
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: hash,
		Timezone:     req.Timezone,
		Status:       "active",
		RoleID:       &role.ID,
	}
	if u.Timezone == "" {
		u.Timezone = "UTC"
	}

	if err := uc.userRepo.Create(ctx, uc.db, u); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	assignment := &user.UserRoleAssignment{
		UserID:    u.ID,
		RoleID:    role.ID,
		CompanyID: nil,
	}
	if err := uc.userRepo.CreateRoleAssignment(ctx, uc.db, assignment); err != nil {
		return nil, fmt.Errorf("create role assignment: %w", err)
	}

	return u, nil
}

// LoginUserRequest mirrors Laravel's user login.
type LoginUserRequest struct {
	Email    string `validate:"required,email"`
	Password string `validate:"required"`
}

// LoginUser authenticates a system user and returns a JWT token pair with RBAC claims.
func (uc *AuthUseCase) LoginUser(ctx context.Context, req LoginUserRequest) (*auth.TokenPair, *user.User, error) {
	u, err := uc.userRepo.GetByEmail(ctx, uc.db, req.Email)
	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			return nil, nil, apperrors.ErrInvalidCredentials
		}
		return nil, nil, err
	}

	if !auth.VerifyPassword(req.Password, u.PasswordHash) {
		return nil, nil, apperrors.ErrInvalidCredentials
	}

	// Update last login
	u.LastLoginAt = func() *time.Time { t := time.Now().UTC(); return &t }()
	_ = uc.userRepo.Update(ctx, uc.db, u)

	// Build RBAC claims
	assignments, err := uc.userRepo.GetUserRoleAssignments(ctx, uc.db, u.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch role assignments: %w", err)
	}

	var roles []string
	var permissions []string
	var roleAssignments []auth.RoleAssignment

	for _, a := range assignments {
		if a.Role == nil {
			continue
		}
		roles = append(roles, a.Role.Slug)
		roleAssignments = append(roleAssignments, auth.RoleAssignment{
			Role:      a.Role.Slug,
			CompanyID: a.CompanyID,
		})

		perms, err := uc.userRepo.GetPermissionsByRoleID(ctx, uc.db, a.RoleID)
		if err != nil {
			continue
		}
		for _, p := range perms {
			permissions = append(permissions, p.Slug)
		}
	}

	claims := auth.Claims{
		UserID:          u.ID,
		UserType:        "user",
		Roles:           roles,
		Permissions:     permissions,
		RoleAssignments: roleAssignments,
		Timezone:        u.Timezone,
	}

	pair, err := uc.jwtService.GenerateTokenPair(claims)
	if err != nil {
		return nil, nil, fmt.Errorf("generate token pair: %w", err)
	}

	return pair, u, nil
}

// LoginWithSupabaseToken authenticates a user by verifying their Supabase access token,
// looking them up by email in the local DB, and issuing a LifeRise JWT pair.
// This eliminates the need to keep passwords in sync between Supabase Auth and the Go backend.
func (uc *AuthUseCase) LoginWithSupabaseToken(ctx context.Context, supabaseToken string) (*auth.TokenPair, any, error) {
	if uc.supabaseURL == "" || uc.supabaseAnonKey == "" {
		// This means LIFERISE_SUPABASE_PROJECT_URL or LIFERISE_SUPABASE_ANON_KEY is not
		// set on the server. Return ErrServiceUnavailable so the handler can surface a
		// 503 instead of a generic 500, making Railway logs much easier to diagnose.
		return nil, nil, fmt.Errorf(
			"supabase OAuth bridge is not configured: set LIFERISE_SUPABASE_PROJECT_URL and LIFERISE_SUPABASE_ANON_KEY: %w",
			apperrors.ErrServiceUnavailable,
		)
	}

	// Verify token with Supabase Auth API
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, uc.supabaseURL+"/auth/v1/user", nil)
	if err != nil {
		return nil, nil, fmt.Errorf("build supabase request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+supabaseToken)
	req.Header.Set("apikey", uc.supabaseAnonKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("supabase request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, nil, apperrors.ErrInvalidCredentials
	}

	var payload struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, nil, fmt.Errorf("decode supabase response: %w", err)
	}
	if payload.Email == "" {
		return nil, nil, apperrors.ErrInvalidCredentials
	}

	// Try customer first, then user — same fallback order as password login
	c, err := uc.customerRepo.GetByEmail(ctx, uc.db, payload.Email)
	if err == nil {
		c.LastLoginAt = func() *time.Time { t := time.Now().UTC(); return &t }()
		_ = uc.customerRepo.Update(ctx, uc.db, c)

		claims := auth.Claims{
			UserID:   c.ID,
			UserType: "customer",
			Roles:    []string{string(auth.RoleCustomer)},
			Timezone: c.Timezone,
		}
		pair, err := uc.jwtService.GenerateTokenPair(claims)
		if err != nil {
			return nil, nil, fmt.Errorf("generate token pair: %w", err)
		}
		return pair, c, nil
	}

	if !errors.Is(err, apperrors.ErrNotFound) {
		return nil, nil, err
	}

	// Try user (vendor/manager/admin)
	u, err := uc.userRepo.GetByEmail(ctx, uc.db, payload.Email)
	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			return nil, nil, apperrors.ErrInvalidCredentials
		}
		return nil, nil, err
	}

	u.LastLoginAt = func() *time.Time { t := time.Now().UTC(); return &t }()
	_ = uc.userRepo.Update(ctx, uc.db, u)

	assignments, err := uc.userRepo.GetUserRoleAssignments(ctx, uc.db, u.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch role assignments: %w", err)
	}

	var roles []string
	var permissions []string
	var roleAssignments []auth.RoleAssignment

	for _, a := range assignments {
		if a.Role == nil {
			continue
		}
		roles = append(roles, a.Role.Slug)
		roleAssignments = append(roleAssignments, auth.RoleAssignment{
			Role:      a.Role.Slug,
			CompanyID: a.CompanyID,
		})

		perms, err := uc.userRepo.GetPermissionsByRoleID(ctx, uc.db, a.RoleID)
		if err != nil {
			continue
		}
		for _, p := range perms {
			permissions = append(permissions, p.Slug)
		}
	}

	claims := auth.Claims{
		UserID:          u.ID,
		UserType:        "user",
		Roles:           roles,
		Permissions:     permissions,
		RoleAssignments: roleAssignments,
		Timezone:        u.Timezone,
	}

	pair, err := uc.jwtService.GenerateTokenPair(claims)
	if err != nil {
		return nil, nil, fmt.Errorf("generate token pair: %w", err)
	}

	return pair, u, nil
}

// GetCustomerProfile retrieves a customer by ID.
func (uc *AuthUseCase) GetCustomerProfile(ctx context.Context, customerID uint64) (*customer.Customer, error) {
	return uc.customerRepo.GetByID(ctx, uc.db, customerID)
}

// GetUserProfile retrieves a user by ID.
func (uc *AuthUseCase) GetUserProfile(ctx context.Context, userID uint64) (*user.User, error) {
	return uc.userRepo.GetByID(ctx, uc.db, userID)
}

// ForgotPasswordRequest initiates a password reset.
type ForgotPasswordRequest struct {
	Email string `validate:"required,email"`
}

// ResetPasswordRequest completes a password reset.
type ResetPasswordRequest struct {
	Token    string `validate:"required"`
	Code     string `validate:"required"`
	Password string `validate:"required,min=8,max=255"`
}

// ForgotPassword generates a reset token/code, stores it, and sends an email.
func (uc *AuthUseCase) ForgotPassword(ctx context.Context, req ForgotPasswordRequest, appURL string) error {
	// Verify user exists (check both customers and users)
	var userID uint64
	c, err := uc.customerRepo.GetByEmail(ctx, uc.db, req.Email)
	if err == nil {
		userID = c.ID
	} else {
		u, err := uc.userRepo.GetByEmail(ctx, uc.db, req.Email)
		if err != nil {
			if errors.Is(err, apperrors.ErrNotFound) {
				// Don't leak whether email exists
				return nil
			}
			return err
		}
		userID = u.ID
	}

	// Generate secure token and 6-digit code
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return fmt.Errorf("generate token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	code := fmt.Sprintf("%06d", randInt(1000000))

	// Delete any existing reset records for this email
	_ = uc.userRepo.DeletePasswordResetsByEmail(ctx, uc.db, req.Email)

	// Store new reset record
	pr := &user.PasswordReset{
		Email:     req.Email,
		Token:     token,
		Code:      &code,
		ExpiresAt: time.Now().UTC().Add(1 * time.Hour),
	}
	if err := uc.userRepo.CreatePasswordReset(ctx, uc.db, pr); err != nil {
		return fmt.Errorf("store reset token: %w", err)
	}

	// Send email if notification service is available
	if uc.notificationUC != nil {
		resetLink := fmt.Sprintf("%s/reset-password?token=%s&code=%s", appURL, token, code)
		_ = uc.notificationUC.SendEmail(ctx, userID, req.Email, "Reset your LifeRise password", "password_reset", map[string]string{
			"reset_link": resetLink,
			"code":       code,
			"expires_in": "1 hour",
		}, "system")
	}

	return nil
}

// ResetPassword validates token+code and updates the password.
func (uc *AuthUseCase) ResetPassword(ctx context.Context, req ResetPasswordRequest) error {
	pr, err := uc.userRepo.GetPasswordResetByToken(ctx, uc.db, req.Token)
	if err != nil {
		if errors.Is(err, apperrors.ErrNotFound) {
			return apperrors.ErrInvalidCredentials
		}
		return err
	}

	// Check expiry
	if time.Now().UTC().After(pr.ExpiresAt) {
		return errors.New("reset link has expired")
	}

	// Validate code
	if pr.Code == nil || *pr.Code != req.Code {
		return errors.New("invalid reset code")
	}

	// Hash new password
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	// Try customer first, then user
	c, err := uc.customerRepo.GetByEmail(ctx, uc.db, pr.Email)
	if err == nil {
		c.PasswordHash = hash
		c.UpdatedAt = time.Now().UTC()
		if err := uc.customerRepo.Update(ctx, uc.db, c); err != nil {
			return fmt.Errorf("update customer password: %w", err)
		}
	} else {
		u, err := uc.userRepo.GetByEmail(ctx, uc.db, pr.Email)
		if err != nil {
			if errors.Is(err, apperrors.ErrNotFound) {
				return apperrors.ErrInvalidCredentials
			}
			return err
		}
		u.PasswordHash = hash
		u.UpdatedAt = time.Now().UTC()
		if err := uc.userRepo.Update(ctx, uc.db, u); err != nil {
			return fmt.Errorf("update user password: %w", err)
		}
	}

	// Clean up reset record
	_ = uc.userRepo.DeletePasswordResetsByEmail(ctx, uc.db, pr.Email)

	return nil
}

func randInt(max int) int {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return int((uint32(b[0]) | uint32(b[1])<<8 | uint32(b[2])<<16 | uint32(b[3])<<24) % uint32(max))
}

// RefreshToken validates a refresh token and issues a new token pair.
func (uc *AuthUseCase) RefreshToken(ctx context.Context, refreshToken string) (*auth.TokenPair, error) {
	// Parse refresh token using RegisteredClaims (refresh tokens do not contain custom Claims)
	userID, err := uc.jwtService.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, apperrors.ErrInvalidCredentials
	}

	// Re-fetch the user/customer to build fresh claims
	var newClaims auth.Claims

	// Try customer first
	customer, err := uc.customerRepo.GetByID(ctx, uc.db, userID)
	if err == nil {
		newClaims = auth.Claims{
			UserID:   customer.ID,
			UserType: "customer",
			Roles:    []string{string(auth.RoleCustomer)},
			Timezone: customer.Timezone,
		}
	} else {
		// Try user
		u, err := uc.userRepo.GetByID(ctx, uc.db, userID)
		if err != nil {
			return nil, apperrors.ErrInvalidCredentials
		}

		assignments, err := uc.userRepo.GetUserRoleAssignments(ctx, uc.db, u.ID)
		if err != nil {
			return nil, err
		}

		var roles []string
		var permissions []string
		var roleAssignments []auth.RoleAssignment

		for _, a := range assignments {
			if a.Role == nil {
				continue
			}
			roles = append(roles, a.Role.Slug)
			roleAssignments = append(roleAssignments, auth.RoleAssignment{
				Role:      a.Role.Slug,
				CompanyID: a.CompanyID,
			})

			perms, err := uc.userRepo.GetPermissionsByRoleID(ctx, uc.db, a.RoleID)
			if err != nil {
				continue
			}
			for _, p := range perms {
				permissions = append(permissions, p.Slug)
			}
		}

		newClaims = auth.Claims{
			UserID:          u.ID,
			UserType:        "user",
			Roles:           roles,
			Permissions:     permissions,
			RoleAssignments: roleAssignments,
			Timezone:        u.Timezone,
		}
	}

	pair, err := uc.jwtService.GenerateTokenPair(newClaims)
	if err != nil {
		return nil, fmt.Errorf("generate token pair: %w", err)
	}

	return pair, nil
}
