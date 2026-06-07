package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/liferise/backend/internal/adapters/http/middleware"
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

	userIDVal, _ := c.Get(middleware.UserIDKey)
	userID := userIDVal.(uint64)

	if err := h.uc.SendEmail(c.Request.Context(), userID, req.To, req.Subject, req.Template, req.Data, "email"); err != nil {
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

	userIDVal, _ := c.Get(middleware.UserIDKey)
	userID := userIDVal.(uint64)

	if err := h.uc.SendPushNotification(c.Request.Context(), userID, req.Tokens, req.Title, req.Body, req.Data, "push"); err != nil {
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

	userIDVal, _ := c.Get(middleware.UserIDKey)
	userID := userIDVal.(uint64)

	if err := h.uc.SendBookingConfirmation(c.Request.Context(), userID, req.CustomerEmail, req.DeviceTokens, req.BookingID); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to send confirmation.", nil)
		return
	}

	response.Success(c, http.StatusAccepted, "Booking confirmation notifications sent.", nil)
}

// List returns paginated notifications for the authenticated user.
func (h *NotificationHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	unread := c.Query("unread") == "true"

	userIDVal, exists := c.Get(middleware.UserIDKey)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}
	userID := userIDVal.(uint64)

	notifications, total, err := h.uc.ListNotifications(c.Request.Context(), userID, unread, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to retrieve notifications.", nil)
		return
	}

	lastPage := int(total) / perPage
	if int(total)%perPage > 0 {
		lastPage++
	}
	if lastPage < 1 {
		lastPage = 1
	}

	response.Success(c, http.StatusOK, "Notifications retrieved.", gin.H{
		"notifications": notifications,
		"total":         total,
		"page":          page,
		"per_page":      perPage,
		"last_page":     lastPage,
	})
}

// MarkRead marks a notification as read.
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	userIDVal, exists := c.Get(middleware.UserIDKey)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}
	userID := userIDVal.(uint64)

	if err := h.uc.MarkRead(c.Request.Context(), userID, id); err != nil {
		response.Error(c, http.StatusNotFound, "Notification not found.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Notification marked as read.", nil)
}

// MarkAllRead marks all unread notifications as read for the authenticated user.
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userIDVal, exists := c.Get(middleware.UserIDKey)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}
	userID := userIDVal.(uint64)

	if err := h.uc.MarkAllRead(c.Request.Context(), userID); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to mark notifications as read.", nil)
		return
	}

	response.Success(c, http.StatusOK, "All notifications marked as read.", nil)
}

// RegisterDeviceTokenRequest registers an FCM device token.
type RegisterDeviceTokenRequest struct {
	Token    string `json:"token" validate:"required"`
	Platform string `json:"platform" validate:"required,oneof=web ios android"`
}

// RegisterDeviceToken persists a device token for push notifications.
func (h *NotificationHandler) RegisterDeviceToken(c *gin.Context) {
	var req RegisterDeviceTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	userIDVal, _ := c.Get(middleware.UserIDKey)
	userID := userIDVal.(uint64)

	if err := h.uc.RegisterDeviceToken(c.Request.Context(), userID, req.Token, req.Platform); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to register device token.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Device token registered.", nil)
}

// DeleteDeviceTokenRequest removes an FCM device token.
type DeleteDeviceTokenRequest struct {
	Token string `json:"token" validate:"required"`
}

// DeleteDeviceToken removes a device token.
func (h *NotificationHandler) DeleteDeviceToken(c *gin.Context) {
	var req DeleteDeviceTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if err := h.uc.DeleteDeviceToken(c.Request.Context(), req.Token); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete device token.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Device token deleted.", nil)
}
