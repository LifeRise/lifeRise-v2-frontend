package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/event"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminEventHandler handles admin group event CRUD.
type AdminEventHandler struct {
	db          *gorm.DB
	eventRepo   *persistence.EventRepo
	auditLogger *appaudit.Logger
}

// NewAdminEventHandler creates a new AdminEventHandler.
func NewAdminEventHandler(db *gorm.DB, eventRepo *persistence.EventRepo, auditLogger *appaudit.Logger) *AdminEventHandler {
	return &AdminEventHandler{db: db, eventRepo: eventRepo, auditLogger: auditLogger}
}

// CreateGroupEventRequest defines the body for creating a group event.
type CreateGroupEventRequest struct {
	CompanyID   uint64                 `json:"company_id" validate:"required"`
	Title       string                 `json:"title" validate:"required"`
	Description *string                `json:"description"`
	StartAt     string                 `json:"start_at" validate:"required"`
	EndAt       string                 `json:"end_at" validate:"required"`
	Location    map[string]interface{} `json:"location"`
	Capacity    *int                   `json:"capacity"`
	Status      string                 `json:"status" validate:"oneof=scheduled cancelled completed"`
}

// UpdateGroupEventRequest defines the body for updating a group event.
type UpdateGroupEventRequest struct {
	CompanyID   *uint64                `json:"company_id"`
	Title       *string                `json:"title"`
	Description *string                `json:"description"`
	StartAt     *string                `json:"start_at"`
	EndAt       *string                `json:"end_at"`
	Location    map[string]interface{} `json:"location"`
	Capacity    *int                   `json:"capacity"`
	Status      *string                `json:"status" validate:"omitempty,oneof=scheduled cancelled completed"`
}

// List returns paginated group events.
func (h *AdminEventHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	companyIDStr := c.Query("company_id")
	status := c.Query("status")
	search := c.Query("search")

	var companyID *uint64
	if companyIDStr != "" {
		if id, err := strconv.ParseUint(companyIDStr, 10, 64); err == nil {
			companyID = &id
		}
	}

	events, total, err := h.eventRepo.ListAdmin(c.Request.Context(), h.db, companyID, status, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load group events.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(events))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Group events retrieved.", events, meta, links)
}

// Get returns a single group event.
func (h *AdminEventHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	e, err := h.eventRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Group event not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Group event retrieved.", e)
}

// Create creates a new group event.
func (h *AdminEventHandler) Create(c *gin.Context) {
	var req CreateGroupEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	startAt, err := time.Parse(time.RFC3339, req.StartAt)
	if err != nil {
		response.ValidationErrorSingle(c, "start_at", "The start_at must be a valid RFC3339 datetime.")
		return
	}
	endAt, err := time.Parse(time.RFC3339, req.EndAt)
	if err != nil {
		response.ValidationErrorSingle(c, "end_at", "The end_at must be a valid RFC3339 datetime.")
		return
	}

	e := event.GroupEvent{
		CompanyID: req.CompanyID,
		Title:     req.Title,
		StartAt:   startAt,
		EndAt:     endAt,
		Status:    req.Status,
	}
	if req.Description != nil {
		e.Description = req.Description
	}
	if req.Location != nil {
		locJSON, _ := json.Marshal(req.Location)
		e.Location = datatypes.JSON(locJSON)
	}
	if req.Capacity != nil {
		e.Capacity = req.Capacity
	}
	if e.Status == "" {
		e.Status = string(event.GroupEventStatusScheduled)
	}

	if err := h.eventRepo.Create(c.Request.Context(), h.db, &e); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create group event.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "group_events", e.ID, nil, e)

	response.Success(c, http.StatusCreated, "Group event created.", e)
}

// Update updates a group event.
func (h *AdminEventHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateGroupEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	e, err := h.eventRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Group event not found.", nil)
		return
	}

	old := *e
	if req.CompanyID != nil {
		e.CompanyID = *req.CompanyID
	}
	if req.Title != nil {
		e.Title = *req.Title
	}
	if req.Description != nil {
		e.Description = req.Description
	}
	if req.StartAt != nil {
		startAt, err := time.Parse(time.RFC3339, *req.StartAt)
		if err != nil {
			response.ValidationErrorSingle(c, "start_at", "The start_at must be a valid RFC3339 datetime.")
			return
		}
		e.StartAt = startAt
	}
	if req.EndAt != nil {
		endAt, err := time.Parse(time.RFC3339, *req.EndAt)
		if err != nil {
			response.ValidationErrorSingle(c, "end_at", "The end_at must be a valid RFC3339 datetime.")
			return
		}
		e.EndAt = endAt
	}
	if req.Location != nil {
		locJSON, _ := json.Marshal(req.Location)
		e.Location = datatypes.JSON(locJSON)
	}
	if req.Capacity != nil {
		e.Capacity = req.Capacity
	}
	if req.Status != nil {
		e.Status = *req.Status
	}

	if err := h.eventRepo.Update(c.Request.Context(), h.db, e); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update group event.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "group_events", id, old, e)

	response.Success(c, http.StatusOK, "Group event updated.", e)
}

// Delete soft-deletes a group event.
func (h *AdminEventHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.eventRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete group event.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "group_events", id, nil, nil)

	c.Status(http.StatusNoContent)
}

// AdminEventBookingHandler handles admin event booking CRUD.
type AdminEventBookingHandler struct {
	db          *gorm.DB
	eventRepo   *persistence.EventRepo
	auditLogger *appaudit.Logger
}

// NewAdminEventBookingHandler creates a new AdminEventBookingHandler.
func NewAdminEventBookingHandler(db *gorm.DB, eventRepo *persistence.EventRepo, auditLogger *appaudit.Logger) *AdminEventBookingHandler {
	return &AdminEventBookingHandler{db: db, eventRepo: eventRepo, auditLogger: auditLogger}
}

// CreateEventBookingRequest defines the body for creating an event booking.
type CreateEventBookingRequest struct {
	EventID    uint64  `json:"event_id" validate:"required"`
	CustomerID uint64  `json:"customer_id" validate:"required"`
	Status     string  `json:"status" validate:"oneof=pending accepted active cancelled rejected completed"`
	Notes      *string `json:"notes"`
}

// UpdateEventBookingRequest defines the body for updating an event booking.
type UpdateEventBookingRequest struct {
	EventID    *uint64 `json:"event_id"`
	CustomerID *uint64 `json:"customer_id"`
	Status     *string `json:"status" validate:"omitempty,oneof=pending accepted active cancelled rejected completed"`
	Notes      *string `json:"notes"`
}

// ListEventBookings returns paginated event bookings.
func (h *AdminEventBookingHandler) ListEventBookings(c *gin.Context) {
	p := pagination.Parse(c)
	eventIDStr := c.Query("event_id")
	status := c.Query("status")

	var eventID *uint64
	if eventIDStr != "" {
		if id, err := strconv.ParseUint(eventIDStr, 10, 64); err == nil {
			eventID = &id
		}
	}

	bookings, total, err := h.eventRepo.ListEventBookings(c.Request.Context(), h.db, eventID, status, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load event bookings.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(bookings))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Event bookings retrieved.", bookings, meta, links)
}

// GetEventBooking returns a single event booking.
func (h *AdminEventBookingHandler) GetEventBooking(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	b, err := h.eventRepo.GetEventBookingByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Event booking not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Event booking retrieved.", b)
}

// CreateEventBooking creates a new event booking.
func (h *AdminEventBookingHandler) CreateEventBooking(c *gin.Context) {
	var req CreateEventBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	b := event.EventBooking{
		EventID:    req.EventID,
		CustomerID: req.CustomerID,
		Status:     req.Status,
	}
	if req.Notes != nil {
		b.Notes = req.Notes
	}
	if b.Status == "" {
		b.Status = string(event.EventBookingStatusPending)
	}

	if err := h.eventRepo.CreateEventBooking(c.Request.Context(), h.db, &b); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create event booking.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "event_bookings", b.ID, nil, b)

	response.Success(c, http.StatusCreated, "Event booking created.", b)
}

// UpdateEventBooking updates an event booking.
func (h *AdminEventBookingHandler) UpdateEventBooking(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateEventBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	b, err := h.eventRepo.GetEventBookingByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Event booking not found.", nil)
		return
	}

	old := *b
	if req.EventID != nil {
		b.EventID = *req.EventID
	}
	if req.CustomerID != nil {
		b.CustomerID = *req.CustomerID
	}
	if req.Status != nil {
		b.Status = *req.Status
	}
	if req.Notes != nil {
		b.Notes = req.Notes
	}

	if err := h.eventRepo.UpdateEventBooking(c.Request.Context(), h.db, b); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update event booking.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "event_bookings", id, old, b)

	response.Success(c, http.StatusOK, "Event booking updated.", b)
}

// DeleteEventBooking soft-deletes an event booking.
func (h *AdminEventBookingHandler) DeleteEventBooking(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.eventRepo.DeleteEventBooking(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete event booking.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "event_bookings", id, nil, nil)

	c.Status(http.StatusNoContent)
}
