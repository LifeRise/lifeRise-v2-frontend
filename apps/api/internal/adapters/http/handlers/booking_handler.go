package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	appbooking "github.com/liferise/backend/internal/application/booking"
	"github.com/liferise/backend/internal/domain/booking"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// BookingHandler handles booking-related endpoints.
type BookingHandler struct {
	uc *appbooking.UseCase
}

// NewBookingHandler creates a new BookingHandler.
func NewBookingHandler(uc *appbooking.UseCase) *BookingHandler {
	return &BookingHandler{uc: uc}
}

// CreateBookingRequest mirrors Laravel's booking store validation.
type CreateBookingRequest struct {
	ServiceID   uint64  `json:"service_id" validate:"required"`
	ProviderID  uint64  `json:"provider_id" validate:"required"`
	SlotID      uint64  `json:"slot_id" validate:"required"`
	BookingDate string  `json:"booking_date" validate:"required,datetime=2006-01-02"`
	StartTime   string  `json:"start_time" validate:"required,datetime=15:04:05"`
	EndTime     string  `json:"end_time" validate:"required,datetime=15:04:05"`
	Notes       *string `json:"notes,omitempty"`
	PromoCode   string  `json:"promo_code,omitempty"`
}

// Create handles new booking creation.
func (h *BookingHandler) Create(c *gin.Context) {
	var req CreateBookingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	bookingDate, _ := time.Parse("2006-01-02", req.BookingDate)
	startTime, _ := time.Parse("15:04:05", req.StartTime)
	endTime, _ := time.Parse("15:04:05", req.EndTime)

	customerIDVal, _ := c.Get("user_id")
	customerID := customerIDVal.(uint64)

	b, err := h.uc.CreateBooking(c.Request.Context(), appbooking.CreateBookingRequest{
		CustomerID:        customerID,
		ServiceID:         req.ServiceID,
		ServiceProviderID: req.ProviderID,
		SlotID:            req.SlotID,
		BookingDate:       bookingDate,
		StartTime:         startTime,
		EndTime:           endTime,
		Notes:             req.Notes,
	})
	if err != nil {
		response.Error(c, http.StatusConflict, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Booking created successfully.", gin.H{
		"booking": b,
	})
}

// List returns bookings for the authenticated user (customer or provider).
func (h *BookingHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	status := c.Query("status")

	userIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}
	userID := userIDVal.(uint64)

	userTypeVal, _ := c.Get("user_type")
	userType := "customer"
	if userTypeVal != nil {
		userType = userTypeVal.(string)
	}

	var bookings []booking.Booking
	var total int64
	var err error

	if userType == "customer" {
		bookings, total, err = h.uc.ListBookingsByCustomer(c.Request.Context(), userID, status, page, perPage)
	} else {
		bookings, total, err = h.uc.ListBookingsByProvider(c.Request.Context(), userID, status, page, perPage)
	}

	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to retrieve bookings.", nil)
		return
	}

	lastPage := int(total) / perPage
	if int(total)%perPage > 0 {
		lastPage++
	}
	if lastPage < 1 {
		lastPage = 1
	}

	response.Success(c, http.StatusOK, "Bookings retrieved.", gin.H{
		"data": bookings,
		"links": map[string]interface{}{
			"first": c.Request.URL.Path + "?page=1&per_page=" + strconv.Itoa(perPage),
			"last":  c.Request.URL.Path + "?page=" + strconv.Itoa(lastPage) + "&per_page=" + strconv.Itoa(perPage),
			"prev":  nil,
			"next":  nil,
		},
		"meta": map[string]interface{}{
			"current_page": page,
			"from":         (page-1)*perPage + 1,
			"last_page":    lastPage,
			"path":         c.Request.URL.Path,
			"per_page":     perPage,
			"to":           (page-1)*perPage + len(bookings),
			"total":        total,
		},
	})
}

// Get returns a single booking by ID.
func (h *BookingHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	b, err := h.uc.GetBooking(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Booking not found.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Booking retrieved.", gin.H{
		"booking": b,
	})
}

// UpdateStatus handles booking status transitions (confirm, cancel, complete).
func (h *BookingHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	var req struct {
		Status string  `json:"status" validate:"required,oneof=Pending Confirmed Completed Cancelled Rejected"`
		Reason *string `json:"reason,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint64)
	userType, _ := c.Get("user_type")
	userTypeStr := "customer"
	if userType != nil {
		userTypeStr = userType.(string)
	}

	b, err := h.uc.UpdateStatus(c.Request.Context(), appbooking.UpdateStatusRequest{
		BookingID: id,
		NewStatus: booking.BookingStatus(req.Status),
		UserID:    userID,
		UserType:  userTypeStr,
		Reason:    req.Reason,
	})
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Booking status updated.", gin.H{
		"booking": b,
	})
}

// Reschedule handles booking date/time changes.
func (h *BookingHandler) Reschedule(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	var req struct {
		BookingDate  string `json:"booking_date" validate:"required,datetime=2006-01-02"`
		StartTime    string `json:"start_time" validate:"required,datetime=15:04:05"`
		EndTime      string `json:"end_time" validate:"required,datetime=15:04:05"`
		SlotID       uint64 `json:"slot_id" validate:"required"`
		Reason       string `json:"reason,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	bookingDate, _ := time.Parse("2006-01-02", req.BookingDate)
	startTime, _ := time.Parse("15:04:05", req.StartTime)
	endTime, _ := time.Parse("15:04:05", req.EndTime)

	userIDVal, _ := c.Get("user_id")
	userID := userIDVal.(uint64)

	b, err := h.uc.RescheduleBooking(c.Request.Context(), appbooking.RescheduleBookingRequest{
		BookingID:    id,
		NewSlotID:    req.SlotID,
		NewDate:      bookingDate,
		NewStartTime: startTime,
		NewEndTime:   endTime,
		Reason:       req.Reason,
		UserID:       userID,
	})
	if err != nil {
		response.Error(c, http.StatusConflict, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Booking rescheduled.", gin.H{
		"booking": b,
	})
}
