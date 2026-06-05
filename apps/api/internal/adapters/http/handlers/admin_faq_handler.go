package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/faq"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminFAQHandler handles admin FAQ CRUD.
type AdminFAQHandler struct {
	db          *gorm.DB
	faqRepo     *persistence.FAQRepo
	auditLogger *appaudit.Logger
}

// NewAdminFAQHandler creates a new AdminFAQHandler.
func NewAdminFAQHandler(db *gorm.DB, faqRepo *persistence.FAQRepo, auditLogger *appaudit.Logger) *AdminFAQHandler {
	return &AdminFAQHandler{db: db, faqRepo: faqRepo, auditLogger: auditLogger}
}

// CreateFAQRequest defines the body for creating an FAQ.
type CreateFAQRequest struct {
	Category  string `json:"category" validate:"required"`
	Question  string `json:"question" validate:"required"`
	Answer    string `json:"answer" validate:"required"`
	SortOrder int    `json:"sort_order"`
	Active    bool   `json:"active"`
}

// UpdateFAQRequest defines the body for updating an FAQ.
type UpdateFAQRequest struct {
	Category  *string `json:"category"`
	Question  *string `json:"question"`
	Answer    *string `json:"answer"`
	SortOrder *int    `json:"sort_order"`
	Active    *bool   `json:"active"`
}

// List returns paginated FAQs.
func (h *AdminFAQHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	category := c.Query("category")
	search := c.Query("search")

	items, total, err := h.faqRepo.ListAdmin(c.Request.Context(), h.db, category, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load FAQs.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(items))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "FAQs retrieved.", items, meta, links)
}

// Get returns a single FAQ.
func (h *AdminFAQHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	item, err := h.faqRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "FAQ not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "FAQ retrieved.", item)
}

// Create creates a new FAQ.
func (h *AdminFAQHandler) Create(c *gin.Context) {
	var req CreateFAQRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	f := faq.FAQ{
		Category:  req.Category,
		Question:  req.Question,
		Answer:    req.Answer,
		SortOrder: req.SortOrder,
		Active:    req.Active,
	}

	if err := h.faqRepo.Create(c.Request.Context(), h.db, &f); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create FAQ.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "faqs", f.ID, nil, f)

	response.Success(c, http.StatusCreated, "FAQ created.", f)
}

// Update updates an FAQ.
func (h *AdminFAQHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateFAQRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	f, err := h.faqRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "FAQ not found.", nil)
		return
	}

	old := *f
	if req.Category != nil {
		f.Category = *req.Category
	}
	if req.Question != nil {
		f.Question = *req.Question
	}
	if req.Answer != nil {
		f.Answer = *req.Answer
	}
	if req.SortOrder != nil {
		f.SortOrder = *req.SortOrder
	}
	if req.Active != nil {
		f.Active = *req.Active
	}

	if err := h.faqRepo.Update(c.Request.Context(), h.db, f); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update FAQ.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "faqs", id, old, f)

	response.Success(c, http.StatusOK, "FAQ updated.", f)
}

// Delete soft-deletes an FAQ.
func (h *AdminFAQHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.faqRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete FAQ.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "faqs", id, nil, nil)

	c.Status(http.StatusNoContent)
}
