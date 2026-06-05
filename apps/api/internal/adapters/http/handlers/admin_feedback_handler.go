package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminFeedbackHandler handles admin feedback CRUD.
type AdminFeedbackHandler struct {
	db           *gorm.DB
	feedbackRepo *persistence.FeedbackRepo
	auditLogger  *appaudit.Logger
}

// NewAdminFeedbackHandler creates a new AdminFeedbackHandler.
func NewAdminFeedbackHandler(db *gorm.DB, feedbackRepo *persistence.FeedbackRepo, auditLogger *appaudit.Logger) *AdminFeedbackHandler {
	return &AdminFeedbackHandler{db: db, feedbackRepo: feedbackRepo, auditLogger: auditLogger}
}

// UpdateFeedbackRequest defines the body for updating feedback.
type UpdateFeedbackRequest struct {
	FlaggedAt *string `json:"flagged_at"`
}

// List returns paginated feedbacks.
func (h *AdminFeedbackHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	search := c.Query("search")

	feedbacks, total, err := h.feedbackRepo.ListAdmin(c.Request.Context(), h.db, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load feedbacks.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(feedbacks))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Feedbacks retrieved.", feedbacks, meta, links)
}

// Get returns a single feedback.
func (h *AdminFeedbackHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	f, err := h.feedbackRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Feedback not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Feedback retrieved.", f)
}

// Update updates a feedback (primarily for flagging/unflagging).
func (h *AdminFeedbackHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateFeedbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	f, err := h.feedbackRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Feedback not found.", nil)
		return
	}

	old := *f
	if req.FlaggedAt != nil {
		if *req.FlaggedAt == "" {
			f.FlaggedAt = nil
		} else {
			t, err := time.Parse(time.RFC3339, *req.FlaggedAt)
			if err != nil {
				response.ValidationErrorSingle(c, "flagged_at", "The flagged_at must be a valid RFC3339 datetime.")
				return
			}
			f.FlaggedAt = &t
		}
	}

	if err := h.feedbackRepo.Update(c.Request.Context(), h.db, f); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update feedback.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "feedbacks", id, old, f)

	response.Success(c, http.StatusOK, "Feedback updated.", f)
}

// Delete deletes a feedback.
func (h *AdminFeedbackHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.feedbackRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete feedback.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "feedbacks", id, nil, nil)

	c.Status(http.StatusNoContent)
}
