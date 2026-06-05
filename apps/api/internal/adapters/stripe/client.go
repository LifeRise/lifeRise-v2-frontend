package stripe

import (
	"context"

	stripeSDK "github.com/stripe/stripe-go/v81"
	"github.com/stripe/stripe-go/v81/account"
	"github.com/stripe/stripe-go/v81/paymentintent"
	"github.com/stripe/stripe-go/v81/refund"
	"github.com/stripe/stripe-go/v81/transfer"
	"github.com/stripe/stripe-go/v81/webhook"
)

// Client wraps the official stripe-go SDK to implement application/payment.StripeClient.
type Client struct {
	webhookSecret string
}

// NewClient creates a new Stripe adapter. Set the global stripe key before using.
func NewClient(apiKey, webhookSecret string) *Client {
	stripeSDK.Key = apiKey
	return &Client{webhookSecret: webhookSecret}
}

// CreatePaymentIntent calls Stripe PaymentIntents.Create.
func (c *Client) CreatePaymentIntent(_ context.Context, params *stripeSDK.PaymentIntentParams) (*stripeSDK.PaymentIntent, error) {
	return paymentintent.New(params)
}

// ConfirmPaymentIntent calls Stripe PaymentIntents.Confirm.
func (c *Client) ConfirmPaymentIntent(_ context.Context, id string, params *stripeSDK.PaymentIntentConfirmParams) (*stripeSDK.PaymentIntent, error) {
	return paymentintent.Confirm(id, params)
}

// CreateRefund calls Stripe Refunds.New.
func (c *Client) CreateRefund(_ context.Context, params *stripeSDK.RefundParams) (*stripeSDK.Refund, error) {
	return refund.New(params)
}

// CreateTransfer calls Stripe Transfers.New.
func (c *Client) CreateTransfer(_ context.Context, params *stripeSDK.TransferParams) (*stripeSDK.Transfer, error) {
	return transfer.New(params)
}

// GetAccount calls Stripe Accounts.Get.
func (c *Client) GetAccount(_ context.Context, id string, params *stripeSDK.AccountParams) (*stripeSDK.Account, error) {
	return account.GetByID(id, params)
}

// ConstructEvent wraps webhook.ConstructEvent for signature verification.
func (c *Client) ConstructEvent(payload []byte, signature string) (stripeSDK.Event, error) {
	return webhook.ConstructEvent(payload, signature, c.webhookSecret)
}
