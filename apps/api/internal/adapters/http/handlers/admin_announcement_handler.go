package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	appnotification "github.com/liferise/backend/internal/application/notification"
	"github.com/liferise/backend/internal/domain/announcement"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminAnnouncementHandler handles admin announcement CRUD.
type AdminAnnouncementHandler struct {
	db               *gorm.DB
	announcementRepo *persistence.AnnouncementRepo
	auditLogger      *appaudit.Logger
	notificationUC   *appnotification.UseCase
}

// NewAdminAnnouncementHandler creates a new AdminAnnouncementHandler.
func NewAdminAnnouncementHandler(db *gorm.DB, announcementRepo *persistence.AnnouncementRepo, auditLogger *appaudit.Logger, notificationUC *appnotification.UseCase) *AdminAnnouncementHandler {
	return &AdminAnnouncementHandler{db: db, announcementRepo: announcementRepo, auditLogger: auditLogger, notificationUC: notificationUC}
}

// CreateAnnouncementRequest defines the body for creating an announcement.
type CreateAnnouncementRequest struct {
	Title       string  `json:"title" validate:"required"`
	Body        string  `json:"body" validate:"required"`
	Audience    string  `json:"audience" validate:"required,oneof=all residents vendors"`
	Priority    string  `json:"priority" validate:"oneof=normal urgent"`
	CompanyID   *uint64 `json:"company_id"`
	PublishedAt string  `json:"published_at" validate:"required"`
	ExpiresAt   *string `json:"expires_at"`
}

// UpdateAnnouncementRequest defines the body for updating an announcement.
type UpdateAnnouncementRequest struct {
	Title       *string `json:"title"`
	Body        *string `json:"body"`
	Audience    *string `json:"audience" validate:"omitempty,oneof=all residents vendors"`
	Priority    *string `json:"priority" validate:"omitempty,oneof=normal urgent"`
	CompanyID   *uint64 `json:"company_id"`
	PublishedAt *string `json:"published_at"`
	ExpiresAt   *string `json:"expires_at"`
}

// List returns paginated announcements.
func (h *AdminAnnouncementHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	companyIDStr := c.Query("company_id")
	var companyID *uint64
	if companyIDStr != "" {
		if id, err := strconv.ParseUint(companyIDStr, 10, 64); err == nil {
			companyID = &id
		}
	}
	audience := c.Query("audience")
	search := c.Query("search")

	items, total, err := h.announcementRepo.ListAdmin(c.Request.Context(), h.db, companyID, audience, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load announcements.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(items))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Announcements retrieved.", items, meta, links)
}

// Get returns a single announcement.
func (h *AdminAnnouncementHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	item, err := h.announcementRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Announcement not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Announcement retrieved.", item)
}

// Create creates a new announcement and emails the target audience.
func (h *AdminAnnouncementHandler) Create(c *gin.Context) {
	var req CreateAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	publishedAt, err := time.Parse(time.RFC3339, req.PublishedAt)
	if err != nil {
		response.ValidationErrorSingle(c, "published_at", "The published_at must be a valid RFC3339 datetime.")
		return
	}

	var expiresAt *time.Time
	if req.ExpiresAt != nil {
		et, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.ValidationErrorSingle(c, "expires_at", "The expires_at must be a valid RFC3339 datetime.")
			return
		}
		expiresAt = &et
	}

	priority := req.Priority
	if priority == "" {
		priority = string(announcement.PriorityNormal)
	}

	a := announcement.Announcement{
		Title:       req.Title,
		Body:        req.Body,
		Audience:    req.Audience,
		Priority:    priority,
		CompanyID:   req.CompanyID,
		PublishedAt: publishedAt,
		ExpiresAt:   expiresAt,
	}

	if err := h.announcementRepo.Create(c.Request.Context(), h.db, &a); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create announcement.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "announcements", a.ID, nil, a)

	// Fire-and-forget: enqueue emails to the target audience
	if h.notificationUC != nil {
		go h.sendAnnouncementEmails(c.Request.Context(), a)
	}

	response.Success(c, http.StatusCreated, "Announcement created.", a)
}

// sendAnnouncementEmails enqueues emails to the target audience asynchronously.
func (h *AdminAnnouncementHandler) sendAnnouncementEmails(ctx context.Context, a announcement.Announcement) {
	emails, err := h.resolveRecipientEmails(ctx, a.Audience)
	if err != nil {
		return
	}

	for _, email := range emails {
		_ = h.notificationUC.SendEmail(ctx, 0, email, a.Title, "announcement", map[string]string{
			"title": a.Title,
			"body":  a.Body,
		}, "announcement")
	}
}

// resolveRecipientEmails returns email addresses for the given audience.
func (h *AdminAnnouncementHandler) resolveRecipientEmails(ctx context.Context, audience string) ([]string, error) {
	switch audience {
	case "residents":
		return h.queryCustomerEmails(ctx)
	case "vendors":
		return h.queryVendorEmails(ctx)
	case "all":
		customers, err := h.queryCustomerEmails(ctx)
		if err != nil {
			return nil, err
		}
		vendors, err := h.queryVendorEmails(ctx)
		if err != nil {
			return nil, err
		}
		return append(customers, vendors...), nil
	default:
		return nil, fmt.Errorf("unknown audience: %s", audience)
	}
}

func (h *AdminAnnouncementHandler) queryCustomerEmails(ctx context.Context) ([]string, error) {
	var emails []string
	err := h.db.WithContext(ctx).Model(&struct {
		Email string
	}{}).
		Table("customers").
		Where("deleted_at IS NULL AND status = ?", "active").
		Pluck("email", &emails).Error
	return emails, err
}

func (h *AdminAnnouncementHandler) queryVendorEmails(ctx context.Context) ([]string, error) {
	var emails []string
	err := h.db.WithContext(ctx).
		Table("users").
		Select("DISTINCT users.email").
		Joins("JOIN user_role_assignments ON user_role_assignments.user_id = users.id").
		Joins("JOIN roles ON roles.id = user_role_assignments.role_id").
		Where("users.deleted_at IS NULL AND users.status = ? AND roles.slug = ?", "active", "service_provider").
		Pluck("email", &emails).Error
	return emails, err
}

// Update updates an announcement.
func (h *AdminAnnouncementHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateAnnouncementRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	a, err := h.announcementRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Announcement not found.", nil)
		return
	}

	old := *a
	if req.Title != nil {
		a.Title = *req.Title
	}
	if req.Body != nil {
		a.Body = *req.Body
	}
	if req.Audience != nil {
		a.Audience = *req.Audience
	}
	if req.Priority != nil {
		a.Priority = *req.Priority
	}
	if req.CompanyID != nil {
		a.CompanyID = req.CompanyID
	}
	if req.PublishedAt != nil {
		pt, err := time.Parse(time.RFC3339, *req.PublishedAt)
		if err != nil {
			response.ValidationErrorSingle(c, "published_at", "The published_at must be a valid RFC3339 datetime.")
			return
		}
		a.PublishedAt = pt
	}
	if req.ExpiresAt != nil {
		et, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.ValidationErrorSingle(c, "expires_at", "The expires_at must be a valid RFC3339 datetime.")
			return
		}
		a.ExpiresAt = &et
	} else {
		a.ExpiresAt = nil
	}

	if err := h.announcementRepo.Update(c.Request.Context(), h.db, a); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update announcement.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "announcements", id, old, a)

	response.Success(c, http.StatusOK, "Announcement updated.", a)
}

// Delete soft-deletes an announcement.
func (h *AdminAnnouncementHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.announcementRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete announcement.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "announcements", id, nil, nil)

	c.Status(http.StatusNoContent)
}
