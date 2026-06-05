package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminBookingHandler handles admin booking operations.
type AdminBookingHandler struct {
	db          *gorm.DB
	bookingRepo *persistence.BookingRepo
	auditLogger *appaudit.Logger
}

// NewAdminBookingHandler creates a new AdminBookingHandler.
func NewAdminBookingHandler(db *gorm.DB, bookingRepo *persistence.BookingRepo, auditLogger *appaudit.Logger) *AdminBookingHandler {
	return &AdminBookingHandler{db: db, bookingRepo: bookingRepo, auditLogger: auditLogger}
}

// UpdateBookingAdminRequest defines the body for updating a booking from admin.
type UpdateBookingAdminRequest struct {
	Status        *string `json:"status" validate:"omitempty,oneof=pending accepted active cancelled rejected completed"`
	PaymentStatus *string `json:"payment_status" validate:"omitempty,oneof=pending paid failed refunded"`
	Notes         *string `json:"notes"`
}

// List returns paginated bookings for admin.
func (h *AdminBookingHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	status := c.Query("status")
	search := c.Query("search")

	bookings, total, err := h.bookingRepo.ListAdmin(c.Request.Context(), h.db, status, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load bookings.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(bookings))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Bookings retrieved.", bookings, meta, links)
}

// Get returns a single booking.
func (h *AdminBookingHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	b, err := h.bookingRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Booking not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Booking retrieved.", b)
}

// Update updates a booking.
func (h *AdminBookingHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateBookingAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	b, err := h.bookingRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Booking not found.", nil)
		return
	}

	old := *b
	if req.Status != nil {
		b.Status = *req.Status
	}
	if req.PaymentStatus != nil {
		b.PaymentStatus = *req.PaymentStatus
	}
	if req.Notes != nil {
		b.Notes = req.Notes
	}

	if err := h.bookingRepo.Update(c.Request.Context(), h.db, b); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update booking.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "bookings", id, old, b)

	response.Success(c, http.StatusOK, "Booking updated.", b)
}

// ListRefunded returns paginated refunded bookings.
func (h *AdminBookingHandler) ListRefunded(c *gin.Context) {
	p := pagination.Parse(c)
	search := c.Query("search")
	dateFrom := c.Query("date_from")
	dateTo := c.Query("date_to")

	bookings, total, err := h.bookingRepo.ListRefunded(c.Request.Context(), h.db, search, dateFrom, dateTo, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load refunded bookings.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(bookings))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Refunded bookings retrieved.", bookings, meta, links)
}

// Delete soft-deletes a booking.
func (h *AdminBookingHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.bookingRepo.SoftDelete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete booking.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "bookings", id, nil, nil)

	c.Status(http.StatusNoContent)
}
