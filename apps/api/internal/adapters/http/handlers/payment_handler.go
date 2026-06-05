package handlers

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	stripeSDK "github.com/stripe/stripe-go/v81"

	apppayment "github.com/liferise/backend/internal/application/payment"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// PaymentHandler handles Stripe payment and refund endpoints.
type PaymentHandler struct {
	stripeUC      *apppayment.StripeUseCase
	webhookSecret string
}

// NewPaymentHandler creates a new PaymentHandler.
func NewPaymentHandler(stripeUC *apppayment.StripeUseCase, webhookSecret string) *PaymentHandler {
	return &PaymentHandler{stripeUC: stripeUC, webhookSecret: webhookSecret}
}

// CreatePaymentIntentRequest mirrors Laravel's payment intent creation.
type CreatePaymentIntentRequest struct {
	BookingID       uint64            `json:"booking_id" validate:"required"`
	PaymentMethodID string            `json:"payment_method_id" validate:"required"`
	Currency        string            `json:"currency,omitempty" validate:"omitempty,len=3"`
	Metadata        map[string]string `json:"metadata,omitempty"`
}

// CreatePaymentIntent initializes a Stripe PaymentIntent for a booking.
func (h *PaymentHandler) CreatePaymentIntent(c *gin.Context) {
	var req CreatePaymentIntentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	currency := req.Currency
	if currency == "" {
		currency = "usd"
	}

	params := &stripeSDK.PaymentIntentParams{
		Amount:             stripeSDK.Int64(0), // calculated by use case from booking
		Currency:           stripeSDK.String(currency),
		PaymentMethod:      stripeSDK.String(req.PaymentMethodID),
		ConfirmationMethod: stripeSDK.String("manual"),
		Confirm:            stripeSDK.Bool(false),
	}

	pi, err := h.stripeUC.CreatePaymentIntent(c.Request.Context(), req.BookingID, params)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Payment intent created.", gin.H{
		"client_secret":     pi.ClientSecret,
		"payment_intent_id": pi.ID,
		"status":            pi.Status,
	})
}

// ConfirmPaymentIntent confirms a Stripe PaymentIntent.
func (h *PaymentHandler) ConfirmPaymentIntent(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		PaymentMethodID string `json:"payment_method_id" validate:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	params := &stripeSDK.PaymentIntentConfirmParams{
		PaymentMethod: stripeSDK.String(req.PaymentMethodID),
	}

	pi, err := h.stripeUC.ConfirmPaymentIntent(c.Request.Context(), id, params)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Payment intent confirmed.", gin.H{
		"status": pi.Status,
	})
}

// GetPayment returns a payment record.
func (h *PaymentHandler) GetPayment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	_ = id // TODO: implement payment retrieval via use case
	response.Success(c, http.StatusOK, "Payment retrieved.", gin.H{
		"payment": nil,
	})
}

// RefundRequest mirrors Laravel's refund validation.
type RefundRequest struct {
	Amount *float64 `json:"amount,omitempty"` // nil for full refund
	Reason *string  `json:"reason,omitempty"`
}

// Refund handles full or partial refunds.
func (h *PaymentHandler) Refund(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	var req RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	var amount *decimal.Decimal
	if req.Amount != nil {
		a := decimal.NewFromFloat(*req.Amount)
		amount = &a
	}

	refund, err := h.stripeUC.ProcessRefund(c.Request.Context(), id, amount, req.Reason)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Refund processed.", gin.H{
		"refund_id": refund.ID,
		"status":    refund.Status,
	})
}

// ReleasePayment triggers vendor payout for a completed booking.
func (h *PaymentHandler) ReleasePayment(c *gin.Context) {
	bookingID, err := strconv.ParseUint(c.Param("booking_id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "booking_id", "The booking_id must be a valid integer.")
		return
	}

	if err := h.stripeUC.ReleasePayment(c.Request.Context(), bookingID); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Payment released to vendor.", nil)
}

// Webhook handles Stripe webhook events.
func (h *PaymentHandler) Webhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Failed to read request body.", nil)
		return
	}

	signature := c.GetHeader("Stripe-Signature")
	if signature == "" {
		response.Error(c, http.StatusBadRequest, "Missing Stripe-Signature header.", nil)
		return
	}

	// TODO: integrate with stripe adapter for signature verification
	// event, err := h.stripeClient.ConstructEvent(payload, signature)
	_ = payload
	_ = h.webhookSecret

	fmt.Println("webhook received")

	response.Success(c, http.StatusOK, "Webhook processed.", gin.H{
		"status": "received",
	})
}
