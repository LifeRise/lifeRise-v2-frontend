package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/user"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminRoleHandler handles admin role CRUD and permissions.
type AdminRoleHandler struct {
	db          *gorm.DB
	userRepo    user.Repository
	auditLogger *appaudit.Logger
}

// NewAdminRoleHandler creates a new AdminRoleHandler.
func NewAdminRoleHandler(db *gorm.DB, userRepo user.Repository, auditLogger *appaudit.Logger) *AdminRoleHandler {
	return &AdminRoleHandler{db: db, userRepo: userRepo, auditLogger: auditLogger}
}

// CreateRoleRequest defines the body for creating a role.
type CreateRoleRequest struct {
	Name        string `json:"name" validate:"required"`
	Slug        string `json:"slug" validate:"required"`
	Description string `json:"description"`
	Level       int    `json:"level"`
}

// UpdateRoleRequest defines the body for updating a role.
type UpdateRoleRequest struct {
	Name        *string `json:"name"`
	Slug        *string `json:"slug"`
	Description *string `json:"description"`
	Level       *int    `json:"level"`
}

// List returns paginated roles.
func (h *AdminRoleHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	search := c.Query("search")

	roles, total, err := h.userRepo.ListRoles(c.Request.Context(), h.db, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load roles.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(roles))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Roles retrieved.", roles, meta, links)
}

// Get returns a single role with permissions.
func (h *AdminRoleHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	role, err := h.userRepo.GetRoleByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Role not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Role retrieved.", role)
}

// Create creates a new role.
func (h *AdminRoleHandler) Create(c *gin.Context) {
	var req CreateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	role := user.Role{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: &req.Description,
		Level:       req.Level,
	}
	if err := h.db.WithContext(c.Request.Context()).Create(&role).Error; err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create role.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "roles", role.ID, nil, role)

	response.Success(c, http.StatusCreated, "Role created.", role)
}

// Update updates a role.
func (h *AdminRoleHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	role, err := h.userRepo.GetRoleByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Role not found.", nil)
		return
	}

	old := *role
	if req.Name != nil {
		role.Name = *req.Name
	}
	if req.Slug != nil {
		role.Slug = *req.Slug
	}
	if req.Description != nil {
		role.Description = req.Description
	}
	if req.Level != nil {
		role.Level = *req.Level
	}

	if err := h.userRepo.UpdateRole(c.Request.Context(), h.db, role); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update role.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "roles", id, old, role)

	response.Success(c, http.StatusOK, "Role updated.", role)
}

// Delete soft-deletes a role.
func (h *AdminRoleHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.userRepo.DeleteRole(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete role.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "roles", id, nil, nil)

	c.Status(http.StatusNoContent)
}

// GetPermissions returns all permissions for a role.
func (h *AdminRoleHandler) GetPermissions(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	perms, err := h.userRepo.GetPermissionsByRoleID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load permissions.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Permissions retrieved.", perms)
}

// UpdatePermissionsRequest defines the body for updating role permissions.
type UpdatePermissionsRequest struct {
	PermissionIDs []uint64 `json:"permission_ids" validate:"required"`
}

// UpdatePermissions replaces a role's permissions.
func (h *AdminRoleHandler) UpdatePermissions(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdatePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if err := h.userRepo.SetRolePermissions(c.Request.Context(), h.db, id, req.PermissionIDs); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update permissions.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "roles", id, nil, req.PermissionIDs)

	response.Success(c, http.StatusOK, "Permissions updated.", gin.H{"role_id": id, "permission_ids": req.PermissionIDs})
}
