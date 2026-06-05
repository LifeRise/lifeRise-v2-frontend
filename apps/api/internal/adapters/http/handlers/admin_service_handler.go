package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/service"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminServiceHandler handles admin service and service-category CRUD.
type AdminServiceHandler struct {
	db          *gorm.DB
	serviceRepo *persistence.ServiceRepo
	auditLogger *appaudit.Logger
}

// NewAdminServiceHandler creates a new AdminServiceHandler.
func NewAdminServiceHandler(db *gorm.DB, serviceRepo *persistence.ServiceRepo, auditLogger *appaudit.Logger) *AdminServiceHandler {
	return &AdminServiceHandler{db: db, serviceRepo: serviceRepo, auditLogger: auditLogger}
}

// ── Service Request Structs ────────────────────────────────────────────────

// AdminCreateServiceRequest defines the body for creating a service.
type AdminCreateServiceRequest struct {
	Name        string   `json:"name" validate:"required"`
	Slug        string   `json:"slug" validate:"required"`
	Description *string  `json:"description"`
	CategoryID  *uint64  `json:"category_id"`
	ProviderID  *uint64  `json:"provider_id"`
	CompanyID   *uint64  `json:"company_id"`
	Price       *float64 `json:"price"`
	Duration    *int     `json:"duration"`
	Status      string   `json:"status" validate:"oneof=active inactive pending"`
	IsFeatured  bool     `json:"is_featured"`
}

// AdminUpdateServiceRequest defines the body for updating a service.
type AdminUpdateServiceRequest struct {
	Name        *string  `json:"name"`
	Slug        *string  `json:"slug"`
	Description *string  `json:"description"`
	CategoryID  *uint64  `json:"category_id"`
	ProviderID  *uint64  `json:"provider_id"`
	CompanyID   *uint64  `json:"company_id"`
	Price       *float64 `json:"price"`
	Duration    *int     `json:"duration"`
	Status      *string  `json:"status" validate:"omitempty,oneof=active inactive pending"`
	IsFeatured  *bool    `json:"is_featured"`
}

// ── Service Handlers ───────────────────────────────────────────────────────

// List returns paginated services.
func (h *AdminServiceHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	status := c.Query("status")
	search := c.Query("search")

	services, total, err := h.serviceRepo.List(c.Request.Context(), h.db, service.ListFilter{
		Status:  status,
		Search:  search,
		Page:    p.Page,
		PerPage: p.PerPage,
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load services.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(services))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Services retrieved.", services, meta, links)
}

// Get returns a single service.
func (h *AdminServiceHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	svc, err := h.serviceRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Service not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Service retrieved.", svc)
}

// Create creates a new service.
func (h *AdminServiceHandler) Create(c *gin.Context) {
	var req AdminCreateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	svc := service.Service{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		CategoryID:  req.CategoryID,
		CompanyID:   req.CompanyID,
		Status:      req.Status,
		IsFeatured:  req.IsFeatured,
	}
	if req.ProviderID != nil {
		svc.ProviderID = *req.ProviderID
	}
	if req.Price != nil {
		svc.Price = decimal.NewFromFloat(*req.Price)
	}
	if req.Duration != nil {
		svc.Duration = *req.Duration
	}
	if svc.Status == "" {
		svc.Status = "active"
	}

	if err := h.serviceRepo.Create(c.Request.Context(), h.db, &svc); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create service.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "services", svc.ID, nil, svc)

	response.Success(c, http.StatusCreated, "Service created.", svc)
}

// Update updates a service.
func (h *AdminServiceHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req AdminUpdateServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	svc, err := h.serviceRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Service not found.", nil)
		return
	}

	old := *svc
	if req.Name != nil {
		svc.Name = *req.Name
	}
	if req.Slug != nil {
		svc.Slug = *req.Slug
	}
	if req.Description != nil {
		svc.Description = req.Description
	}
	if req.CategoryID != nil {
		svc.CategoryID = req.CategoryID
	}
	if req.ProviderID != nil {
		svc.ProviderID = *req.ProviderID
	}
	if req.CompanyID != nil {
		svc.CompanyID = req.CompanyID
	}
	if req.Price != nil {
		svc.Price = decimal.NewFromFloat(*req.Price)
	}
	if req.Duration != nil {
		svc.Duration = *req.Duration
	}
	if req.Status != nil {
		svc.Status = *req.Status
	}
	if req.IsFeatured != nil {
		svc.IsFeatured = *req.IsFeatured
	}

	if err := h.serviceRepo.Update(c.Request.Context(), h.db, svc); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update service.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "services", id, old, svc)

	response.Success(c, http.StatusOK, "Service updated.", svc)
}

// Delete soft-deletes a service.
func (h *AdminServiceHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.serviceRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete service.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "services", id, nil, nil)

	c.Status(http.StatusNoContent)
}

// ── Service Category Request Structs ───────────────────────────────────────

// AdminCreateServiceCategoryRequest defines the body for creating a category.
type AdminCreateServiceCategoryRequest struct {
	Name        string  `json:"name" validate:"required"`
	Slug        string  `json:"slug" validate:"required"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
	SortOrder   int     `json:"sort_order"`
	IsActive    bool    `json:"is_active"`
}

// AdminUpdateServiceCategoryRequest defines the body for updating a category.
type AdminUpdateServiceCategoryRequest struct {
	Name        *string `json:"name"`
	Slug        *string `json:"slug"`
	Description *string `json:"description"`
	Icon        *string `json:"icon"`
	SortOrder   *int    `json:"sort_order"`
	IsActive    *bool   `json:"is_active"`
}

// ── Service Category Handlers ──────────────────────────────────────────────

// ListCategories returns all active service categories.
func (h *AdminServiceHandler) ListCategories(c *gin.Context) {
	cats, err := h.serviceRepo.ListCategories(c.Request.Context(), h.db)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load categories.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Categories retrieved.", cats)
}

// GetCategory returns a single service category.
func (h *AdminServiceHandler) GetCategory(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	cat, err := h.serviceRepo.GetCategoryByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Category not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Category retrieved.", cat)
}

// CreateCategory creates a new service category.
func (h *AdminServiceHandler) CreateCategory(c *gin.Context) {
	var req AdminCreateServiceCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	cat := service.ServiceCategory{
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		Icon:        req.Icon,
		SortOrder:   req.SortOrder,
		IsActive:    req.IsActive,
	}

	if err := h.serviceRepo.CreateCategory(c.Request.Context(), h.db, &cat); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create category.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "service_categories", cat.ID, nil, cat)

	response.Success(c, http.StatusCreated, "Category created.", cat)
}

// UpdateCategory updates a service category.
func (h *AdminServiceHandler) UpdateCategory(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req AdminUpdateServiceCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	cat, err := h.serviceRepo.GetCategoryByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Category not found.", nil)
		return
	}

	old := *cat
	if req.Name != nil {
		cat.Name = *req.Name
	}
	if req.Slug != nil {
		cat.Slug = *req.Slug
	}
	if req.Description != nil {
		cat.Description = req.Description
	}
	if req.Icon != nil {
		cat.Icon = req.Icon
	}
	if req.SortOrder != nil {
		cat.SortOrder = *req.SortOrder
	}
	if req.IsActive != nil {
		cat.IsActive = *req.IsActive
	}

	if err := h.serviceRepo.UpdateCategory(c.Request.Context(), h.db, cat); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update category.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "service_categories", id, old, cat)

	response.Success(c, http.StatusOK, "Category updated.", cat)
}

// DeleteCategory soft-deletes a service category.
func (h *AdminServiceHandler) DeleteCategory(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.serviceRepo.DeleteCategory(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete category.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "service_categories", id, nil, nil)

	c.Status(http.StatusNoContent)
}
