package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/event"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminEventResponseHandler handles admin event response CRUD.
type AdminEventResponseHandler struct {
	db          *gorm.DB
	eventRepo   *persistence.EventRepo
	auditLogger *appaudit.Logger
}

// NewAdminEventResponseHandler creates a new AdminEventResponseHandler.
func NewAdminEventResponseHandler(db *gorm.DB, eventRepo *persistence.EventRepo, auditLogger *appaudit.Logger) *AdminEventResponseHandler {
	return &AdminEventResponseHandler{db: db, eventRepo: eventRepo, auditLogger: auditLogger}
}

// CreateEventResponseRequest defines the body for creating an event response.
type CreateEventResponseRequest struct {
	EventID    uint64 `json:"event_id" validate:"required"`
	CustomerID uint64 `json:"customer_id" validate:"required"`
	Response   string `json:"response" validate:"required,oneof=going maybe declined"`
}

// UpdateEventResponseRequest defines the body for updating an event response.
type UpdateEventResponseRequest struct {
	EventID    *uint64 `json:"event_id"`
	CustomerID *uint64 `json:"customer_id"`
	Response   *string `json:"response" validate:"omitempty,oneof=going maybe declined"`
}

// ListEventResponses returns paginated event responses.
func (h *AdminEventResponseHandler) ListEventResponses(c *gin.Context) {
	p := pagination.Parse(c)
	eventIDStr := c.Query("event_id")
	responseFilter := c.Query("response")

	var eventID *uint64
	if eventIDStr != "" {
		if id, err := strconv.ParseUint(eventIDStr, 10, 64); err == nil {
			eventID = &id
		}
	}

	responses, total, err := h.eventRepo.ListEventResponses(c.Request.Context(), h.db, eventID, responseFilter, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load event responses.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(responses))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Event responses retrieved.", responses, meta, links)
}

// GetEventResponse returns a single event response.
func (h *AdminEventResponseHandler) GetEventResponse(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	r, err := h.eventRepo.GetEventResponseByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Event response not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Event response retrieved.", r)
}

// CreateEventResponse creates a new event response.
func (h *AdminEventResponseHandler) CreateEventResponse(c *gin.Context) {
	var req CreateEventResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	resp := event.EventResponse{
		EventID:    req.EventID,
		CustomerID: req.CustomerID,
		Response:   req.Response,
	}

	if err := h.eventRepo.CreateEventResponse(c.Request.Context(), h.db, &resp); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create event response.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "event_responses", resp.ID, nil, resp)

	response.Success(c, http.StatusCreated, "Event response created.", resp)
}

// UpdateEventResponse updates an event response.
func (h *AdminEventResponseHandler) UpdateEventResponse(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateEventResponseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	resp, err := h.eventRepo.GetEventResponseByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Event response not found.", nil)
		return
	}

	old := *resp
	if req.EventID != nil {
		resp.EventID = *req.EventID
	}
	if req.CustomerID != nil {
		resp.CustomerID = *req.CustomerID
	}
	if req.Response != nil {
		resp.Response = *req.Response
	}

	if err := h.eventRepo.UpdateEventResponse(c.Request.Context(), h.db, resp); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update event response.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "event_responses", id, old, resp)

	response.Success(c, http.StatusOK, "Event response updated.", resp)
}

// DeleteEventResponse hard-deletes an event response.
func (h *AdminEventResponseHandler) DeleteEventResponse(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.eventRepo.DeleteEventResponse(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete event response.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "event_responses", id, nil, nil)

	c.Status(http.StatusNoContent)
}
