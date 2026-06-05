package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	appnotification "github.com/liferise/backend/internal/application/notification"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// NotificationHandler handles notification endpoints.
type NotificationHandler struct {
	uc *appnotification.UseCase
}

// NewNotificationHandler creates a new NotificationHandler.
func NewNotificationHandler(uc *appnotification.UseCase) *NotificationHandler {
	return &NotificationHandler{uc: uc}
}

// SendEmailRequest triggers an email delivery.
type SendEmailRequest struct {
	To       string            `json:"to" validate:"required,email"`
	Subject  string            `json:"subject" validate:"required"`
	Template string            `json:"template" validate:"required"`
	Data     map[string]string `json:"data,omitempty"`
}

// SendEmail enqueues an email delivery task.
func (h *NotificationHandler) SendEmail(c *gin.Context) {
	var req SendEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if err := h.uc.SendEmail(c.Request.Context(), req.To, req.Subject, req.Template, req.Data); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to enqueue email.", nil)
		return
	}

	response.Success(c, http.StatusAccepted, "Email queued for delivery.", nil)
}

// SendPushRequest triggers a push notification.
type SendPushRequest struct {
	Tokens []string          `json:"tokens" validate:"required,min=1"`
	Title  string            `json:"title" validate:"required"`
	Body   string            `json:"body" validate:"required"`
	Data   map[string]string `json:"data,omitempty"`
}

// SendPush enqueues a push notification task.
func (h *NotificationHandler) SendPush(c *gin.Context) {
	var req SendPushRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if err := h.uc.SendPushNotification(c.Request.Context(), req.Tokens, req.Title, req.Body, req.Data); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to enqueue push notification.", nil)
		return
	}

	response.Success(c, http.StatusAccepted, "Push notification queued for delivery.", nil)
}

// BookingConfirmationRequest triggers booking confirmation notifications.
type BookingConfirmationRequest struct {
	CustomerEmail string   `json:"customer_email" validate:"required,email"`
	DeviceTokens  []string `json:"device_tokens"`
	BookingID     uint64   `json:"booking_id" validate:"required"`
}

// SendBookingConfirmation dispatches confirmation push + email.
func (h *NotificationHandler) SendBookingConfirmation(c *gin.Context) {
	var req BookingConfirmationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if err := h.uc.SendBookingConfirmation(c.Request.Context(), req.CustomerEmail, req.DeviceTokens, req.BookingID); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to send confirmation.", nil)
		return
	}

	response.Success(c, http.StatusAccepted, "Booking confirmation notifications sent.", nil)
}
