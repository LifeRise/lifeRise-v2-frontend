package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/waitlist"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminWaitlistHandler handles admin waitlist operations.
type AdminWaitlistHandler struct {
	db           *gorm.DB
	waitlistRepo *persistence.WaitlistRepo
	auditLogger  *appaudit.Logger
}

// NewAdminWaitlistHandler creates a new AdminWaitlistHandler.
func NewAdminWaitlistHandler(db *gorm.DB, waitlistRepo *persistence.WaitlistRepo, auditLogger *appaudit.Logger) *AdminWaitlistHandler {
	return &AdminWaitlistHandler{db: db, waitlistRepo: waitlistRepo, auditLogger: auditLogger}
}

// CreateWaitlistRequest defines the body for creating a waitlist entry.
type CreateWaitlistRequest struct {
	CustomerID  uint64  `json:"customer_id" validate:"required"`
	ServiceID   uint64  `json:"service_id" validate:"required"`
	ProviderID  uint64  `json:"provider_id" validate:"required"`
	DesiredDate string  `json:"desired_date" validate:"required"`
	Status      string  `json:"status" validate:"oneof=waiting notified fulfilled expired cancelled"`
	ExpiresAt   *string `json:"expires_at"`
}

// UpdateWaitlistRequest defines the body for updating a waitlist entry.
type UpdateWaitlistRequest struct {
	CustomerID  *uint64 `json:"customer_id"`
	ServiceID   *uint64 `json:"service_id"`
	ProviderID  *uint64 `json:"provider_id"`
	DesiredDate *string `json:"desired_date"`
	Status      *string `json:"status" validate:"omitempty,oneof=waiting notified fulfilled expired cancelled"`
	NotifiedAt  *string `json:"notified_at"`
	ExpiresAt   *string `json:"expires_at"`
}

// List returns paginated waitlist entries.
func (h *AdminWaitlistHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	status := c.Query("status")
	search := c.Query("search")

	entries, total, err := h.waitlistRepo.ListAdmin(c.Request.Context(), h.db, status, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load waitlist entries.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(entries))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Waitlist entries retrieved.", entries, meta, links)
}

// Get returns a single waitlist entry.
func (h *AdminWaitlistHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	w, err := h.waitlistRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Waitlist entry not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Waitlist entry retrieved.", w)
}

// Create creates a new waitlist entry.
func (h *AdminWaitlistHandler) Create(c *gin.Context) {
	var req CreateWaitlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	desiredDate, err := time.Parse(time.RFC3339, req.DesiredDate)
	if err != nil {
		response.ValidationErrorSingle(c, "desired_date", "The desired_date is not a valid datetime.")
		return
	}

	w := waitlist.WaitlistEntry{
		CustomerID:  req.CustomerID,
		ServiceID:   req.ServiceID,
		ProviderID:  req.ProviderID,
		DesiredDate: desiredDate,
		Status:      req.Status,
	}
	if w.Status == "" {
		w.Status = "waiting"
	}
	if req.ExpiresAt != nil {
		expiresAt, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.ValidationErrorSingle(c, "expires_at", "The expires_at is not a valid datetime.")
			return
		}
		w.ExpiresAt = &expiresAt
	}

	if err := h.waitlistRepo.Create(c.Request.Context(), h.db, &w); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create waitlist entry.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "waitlist_entries", w.ID, nil, w)

	response.Success(c, http.StatusCreated, "Waitlist entry created.", w)
}

// Update updates a waitlist entry.
func (h *AdminWaitlistHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateWaitlistRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	w, err := h.waitlistRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Waitlist entry not found.", nil)
		return
	}

	old := *w
	if req.CustomerID != nil {
		w.CustomerID = *req.CustomerID
	}
	if req.ServiceID != nil {
		w.ServiceID = *req.ServiceID
	}
	if req.ProviderID != nil {
		w.ProviderID = *req.ProviderID
	}
	if req.DesiredDate != nil {
		desiredDate, err := time.Parse(time.RFC3339, *req.DesiredDate)
		if err != nil {
			response.ValidationErrorSingle(c, "desired_date", "The desired_date is not a valid datetime.")
			return
		}
		w.DesiredDate = desiredDate
	}
	if req.Status != nil {
		w.Status = *req.Status
	}
	if req.NotifiedAt != nil {
		notifiedAt, err := time.Parse(time.RFC3339, *req.NotifiedAt)
		if err != nil {
			response.ValidationErrorSingle(c, "notified_at", "The notified_at is not a valid datetime.")
			return
		}
		w.NotifiedAt = &notifiedAt
	}
	if req.ExpiresAt != nil {
		expiresAt, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			response.ValidationErrorSingle(c, "expires_at", "The expires_at is not a valid datetime.")
			return
		}
		w.ExpiresAt = &expiresAt
	}

	if err := h.waitlistRepo.Update(c.Request.Context(), h.db, w); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update waitlist entry.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "waitlist_entries", id, old, w)

	response.Success(c, http.StatusOK, "Waitlist entry updated.", w)
}

// Delete hard-deletes a waitlist entry.
func (h *AdminWaitlistHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.waitlistRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete waitlist entry.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "waitlist_entries", id, nil, nil)

	c.Status(http.StatusNoContent)
}
