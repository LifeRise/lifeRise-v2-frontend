package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/banner"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminBannerHandler handles admin banner CRUD.
type AdminBannerHandler struct {
	db          *gorm.DB
	bannerRepo  *persistence.BannerRepo
	auditLogger *appaudit.Logger
}

// NewAdminBannerHandler creates a new AdminBannerHandler.
func NewAdminBannerHandler(db *gorm.DB, bannerRepo *persistence.BannerRepo, auditLogger *appaudit.Logger) *AdminBannerHandler {
	return &AdminBannerHandler{db: db, bannerRepo: bannerRepo, auditLogger: auditLogger}
}

// CreateBannerRequest defines the body for creating a banner.
type CreateBannerRequest struct {
	Title     string  `json:"title" validate:"required"`
	ImageURL  string  `json:"image_url" validate:"required"`
	TargetURL *string `json:"target_url"`
	Audience  string  `json:"audience" validate:"required"`
	SortOrder int     `json:"sort_order"`
	Active    bool    `json:"active"`
	StartsAt  string  `json:"starts_at" validate:"required"`
	EndsAt    *string `json:"ends_at"`
}

// UpdateBannerRequest defines the body for updating a banner.
type UpdateBannerRequest struct {
	Title     *string `json:"title"`
	ImageURL  *string `json:"image_url"`
	TargetURL *string `json:"target_url"`
	Audience  *string `json:"audience"`
	SortOrder *int    `json:"sort_order"`
	Active    *bool   `json:"active"`
	StartsAt  *string `json:"starts_at"`
	EndsAt    *string `json:"ends_at"`
}

// List returns paginated banners.
func (h *AdminBannerHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	audience := c.Query("audience")
	search := c.Query("search")
	var active *bool
	if c.Query("active") != "" {
		av := c.Query("active") == "true"
		active = &av
	}

	items, total, err := h.bannerRepo.ListAdmin(c.Request.Context(), h.db, audience, active, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load banners.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(items))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Banners retrieved.", items, meta, links)
}

// Get returns a single banner.
func (h *AdminBannerHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	item, err := h.bannerRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Banner not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Banner retrieved.", item)
}

// Create creates a new banner.
func (h *AdminBannerHandler) Create(c *gin.Context) {
	var req CreateBannerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	startsAt, err := time.Parse(time.RFC3339, req.StartsAt)
	if err != nil {
		response.ValidationErrorSingle(c, "starts_at", "The starts_at must be a valid RFC3339 datetime.")
		return
	}

	var endsAt *time.Time
	if req.EndsAt != nil {
		et, err := time.Parse(time.RFC3339, *req.EndsAt)
		if err != nil {
			response.ValidationErrorSingle(c, "ends_at", "The ends_at must be a valid RFC3339 datetime.")
			return
		}
		endsAt = &et
	}

	b := banner.AppBanner{
		Title:     req.Title,
		ImageURL:  req.ImageURL,
		TargetURL: req.TargetURL,
		Audience:  req.Audience,
		SortOrder: req.SortOrder,
		Active:    req.Active,
		StartsAt:  startsAt,
		EndsAt:    endsAt,
	}

	if err := h.bannerRepo.Create(c.Request.Context(), h.db, &b); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create banner.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "app_banners", b.ID, nil, b)

	response.Success(c, http.StatusCreated, "Banner created.", b)
}

// Update updates a banner.
func (h *AdminBannerHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateBannerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	b, err := h.bannerRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Banner not found.", nil)
		return
	}

	old := *b
	if req.Title != nil {
		b.Title = *req.Title
	}
	if req.ImageURL != nil {
		b.ImageURL = *req.ImageURL
	}
	if req.TargetURL != nil {
		b.TargetURL = req.TargetURL
	}
	if req.Audience != nil {
		b.Audience = *req.Audience
	}
	if req.SortOrder != nil {
		b.SortOrder = *req.SortOrder
	}
	if req.Active != nil {
		b.Active = *req.Active
	}
	if req.StartsAt != nil {
		st, err := time.Parse(time.RFC3339, *req.StartsAt)
		if err != nil {
			response.ValidationErrorSingle(c, "starts_at", "The starts_at must be a valid RFC3339 datetime.")
			return
		}
		b.StartsAt = st
	}
	if req.EndsAt != nil {
		et, err := time.Parse(time.RFC3339, *req.EndsAt)
		if err != nil {
			response.ValidationErrorSingle(c, "ends_at", "The ends_at must be a valid RFC3339 datetime.")
			return
		}
		b.EndsAt = &et
	} else {
		b.EndsAt = nil
	}

	if err := h.bannerRepo.Update(c.Request.Context(), h.db, b); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update banner.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "app_banners", id, old, b)

	response.Success(c, http.StatusOK, "Banner updated.", b)
}

// Delete hard-deletes a banner.
func (h *AdminBannerHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.bannerRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete banner.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "app_banners", id, nil, nil)

	c.Status(http.StatusNoContent)
}
