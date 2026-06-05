package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/user"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/pkg/auth"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminUserHandler handles admin user CRUD.
type AdminUserHandler struct {
	db          *gorm.DB
	userRepo    user.Repository
	auditLogger *appaudit.Logger
	jwtService  *auth.Service
}

// NewAdminUserHandler creates a new AdminUserHandler.
func NewAdminUserHandler(db *gorm.DB, userRepo user.Repository, auditLogger *appaudit.Logger, jwtService *auth.Service) *AdminUserHandler {
	return &AdminUserHandler{db: db, userRepo: userRepo, auditLogger: auditLogger, jwtService: jwtService}
}

// CreateUserRequest defines the body for creating a user.
type CreateUserRequest struct {
	FirstName string `json:"first_name" validate:"required"`
	LastName  string `json:"last_name" validate:"required"`
	Email     string `json:"email" validate:"required,email"`
	Phone     string `json:"phone"`
	RoleID    uint64 `json:"role_id" validate:"required"`
	Status    string `json:"status" validate:"oneof=active inactive pending"`
}

// UpdateUserRequest defines the body for updating a user.
type UpdateUserRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Email     *string `json:"email" validate:"omitempty,email"`
	Phone     *string `json:"phone"`
	RoleID    *uint64 `json:"role_id"`
	Status    *string `json:"status" validate:"omitempty,oneof=active inactive pending"`
}

// List returns paginated users.
func (h *AdminUserHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	role := c.Query("role")
	status := c.Query("status")
	search := c.Query("search")

	users, total, err := h.userRepo.List(c.Request.Context(), h.db, role, status, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load users.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(users))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Users retrieved.", users, meta, links)
}

// Get returns a single user.
func (h *AdminUserHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	u, err := h.userRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "User not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "User retrieved.", u)
}

// Create creates a new user.
func (h *AdminUserHandler) Create(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	u := user.User{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Phone:     req.Phone,
		RoleID:    &req.RoleID,
		Status:    req.Status,
	}
	if u.Status == "" {
		u.Status = "active"
	}

	if err := h.userRepo.Create(c.Request.Context(), h.db, &u); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create user.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "users", u.ID, nil, u)

	response.Success(c, http.StatusCreated, "User created.", u)
}

// Update updates a user.
func (h *AdminUserHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	u, err := h.userRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "User not found.", nil)
		return
	}

	old := *u
	if req.FirstName != nil {
		u.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		u.LastName = *req.LastName
	}
	if req.Email != nil {
		u.Email = *req.Email
	}
	if req.Phone != nil {
		u.Phone = *req.Phone
	}
	if req.RoleID != nil {
		u.RoleID = req.RoleID
	}
	if req.Status != nil {
		u.Status = *req.Status
	}

	if err := h.userRepo.Update(c.Request.Context(), h.db, u); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update user.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "users", id, old, u)

	response.Success(c, http.StatusOK, "User updated.", u)
}

// Delete soft-deletes a user.
func (h *AdminUserHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.userRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete user.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "users", id, nil, nil)

	c.Status(http.StatusNoContent)
}

// ResetPassword sends a password reset email (placeholder).
func (h *AdminUserHandler) ResetPassword(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	_, err := h.userRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "User not found.", nil)
		return
	}
	// TODO: integrate with email service to send reset link
	response.Success(c, http.StatusOK, "Password reset email queued.", gin.H{"user_id": id})
}

// Impersonate returns a short-lived JWT for the target user (admin only).
func (h *AdminUserHandler) Impersonate(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	u, err := h.userRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "User not found.", nil)
		return
	}

	assignments, _ := h.userRepo.GetUserRoleAssignments(c.Request.Context(), h.db, u.ID)
	var roles []string
	for _, a := range assignments {
		if a.Role != nil {
			roles = append(roles, a.Role.Slug)
		}
	}

	claims := auth.Claims{
		UserID:   u.ID,
		UserType: "user",
		Roles:    roles,
	}
	tp, err := h.jwtService.GenerateTokenPair(claims)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to generate impersonation token.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Impersonation token generated.", gin.H{
		"access_token":         tp.AccessToken,
		"expires_in":           tp.ExpiresIn,
		"token_type":           tp.TokenType,
		"impersonated_user_id": u.ID,
	})
}
