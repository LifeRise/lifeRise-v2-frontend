package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/company"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminCompanyHandler handles admin company CRUD.
type AdminCompanyHandler struct {
	db          *gorm.DB
	companyRepo *persistence.CompanyRepo
	auditLogger *appaudit.Logger
}

// NewAdminCompanyHandler creates a new AdminCompanyHandler.
func NewAdminCompanyHandler(db *gorm.DB, companyRepo *persistence.CompanyRepo, auditLogger *appaudit.Logger) *AdminCompanyHandler {
	return &AdminCompanyHandler{db: db, companyRepo: companyRepo, auditLogger: auditLogger}
}

// CreateCompanyRequest defines the body for creating a company.
type CreateCompanyRequest struct {
	Name        string              `json:"name" validate:"required"`
	Slug        string              `json:"slug" validate:"required"`
	Email       string              `json:"email" validate:"required,email"`
	Phone       *string             `json:"phone"`
	Website     *string             `json:"website"`
	Logo        *string             `json:"logo"`
	Description *string             `json:"description"`
	Address     datatypes.JSON      `json:"address"`
	Type        company.CompanyType `json:"type" validate:"required"`
	Status      string              `json:"status" validate:"oneof=active pending suspended inactive"`
}

// UpdateCompanyRequest defines the body for updating a company.
type UpdateCompanyRequest struct {
	Name        *string              `json:"name"`
	Slug        *string              `json:"slug"`
	Email       *string              `json:"email" validate:"omitempty,email"`
	Phone       *string              `json:"phone"`
	Website     *string              `json:"website"`
	Logo        *string              `json:"logo"`
	Description *string              `json:"description"`
	Address     datatypes.JSON       `json:"address"`
	Type        *company.CompanyType `json:"type"`
	Status      *string              `json:"status" validate:"omitempty,oneof=active pending suspended inactive"`
}

// List returns paginated companies.
func (h *AdminCompanyHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	companyType := c.Query("type")
	status := c.Query("status")
	search := c.Query("search")

	companies, total, err := h.companyRepo.List(c.Request.Context(), h.db, companyType, status, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load companies.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(companies))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Companies retrieved.", companies, meta, links)
}

// Get returns a single company.
func (h *AdminCompanyHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	co, err := h.companyRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Company not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Company retrieved.", co)
}

// Create creates a new company.
func (h *AdminCompanyHandler) Create(c *gin.Context) {
	var req CreateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}
	if !req.Type.Valid() {
		response.ValidationErrorSingle(c, "type", "The type must be one of: complex, vendor, affiliate.")
		return
	}

	co := company.Company{
		Name:        req.Name,
		Slug:        req.Slug,
		Email:       req.Email,
		Phone:       req.Phone,
		Website:     req.Website,
		Logo:        req.Logo,
		Description: req.Description,
		Address:     req.Address,
		Type:        req.Type,
		Status:      req.Status,
	}
	if co.Status == "" {
		co.Status = "active"
	}

	if err := h.companyRepo.Create(c.Request.Context(), h.db, &co); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create company.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "companies", co.ID, nil, co)

	response.Success(c, http.StatusCreated, "Company created.", co)
}

// Update updates a company.
func (h *AdminCompanyHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateCompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	co, err := h.companyRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Company not found.", nil)
		return
	}

	old := *co
	if req.Name != nil {
		co.Name = *req.Name
	}
	if req.Slug != nil {
		co.Slug = *req.Slug
	}
	if req.Email != nil {
		co.Email = *req.Email
	}
	if req.Phone != nil {
		co.Phone = req.Phone
	}
	if req.Website != nil {
		co.Website = req.Website
	}
	if req.Logo != nil {
		co.Logo = req.Logo
	}
	if req.Description != nil {
		co.Description = req.Description
	}
	if req.Address != nil {
		co.Address = req.Address
	}
	if req.Type != nil {
		co.Type = *req.Type
	}
	if req.Status != nil {
		co.Status = *req.Status
	}

	if err := h.companyRepo.Update(c.Request.Context(), h.db, co); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update company.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "companies", id, old, co)

	response.Success(c, http.StatusOK, "Company updated.", co)
}

// Delete soft-deletes a company.
func (h *AdminCompanyHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.companyRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete company.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "companies", id, nil, nil)

	c.Status(http.StatusNoContent)
}

// Verify marks a company as verified.
func (h *AdminCompanyHandler) Verify(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	co, err := h.companyRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Company not found.", nil)
		return
	}
	now := time.Now().UTC()
	co.VerifiedAt = &now
	if err := h.companyRepo.Update(c.Request.Context(), h.db, co); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to verify company.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Company verified.", co)
}
