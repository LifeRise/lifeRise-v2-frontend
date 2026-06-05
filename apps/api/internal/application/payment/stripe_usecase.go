package payment

import (
	"context"
	"fmt"

	"github.com/shopspring/decimal"
	"github.com/stripe/stripe-go/v81"
	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/booking"
	domain "github.com/liferise/backend/internal/domain/payment"
)

// PlatformFeePercent is the LifeRise marketplace commission.
const PlatformFeePercent = 12.0

// StripeClient abstracts the Stripe SDK operations we depend on.
type StripeClient interface {
	CreatePaymentIntent(ctx context.Context, params *stripe.PaymentIntentParams) (*stripe.PaymentIntent, error)
	ConfirmPaymentIntent(ctx context.Context, id string, params *stripe.PaymentIntentConfirmParams) (*stripe.PaymentIntent, error)
	CreateRefund(ctx context.Context, params *stripe.RefundParams) (*stripe.Refund, error)
	CreateTransfer(ctx context.Context, params *stripe.TransferParams) (*stripe.Transfer, error)
	GetAccount(ctx context.Context, id string, params *stripe.AccountParams) (*stripe.Account, error)
}

// Repository interfaces for transaction-scoped data access.
type PaymentRepository interface {
	GetByBookingID(ctx context.Context, tx *gorm.DB, bookingID uint64) (*domain.StripePayment, error)
	GetByID(ctx context.Context, tx *gorm.DB, id uint64) (*domain.StripePayment, error)
	GetByPaymentIntentID(ctx context.Context, tx *gorm.DB, piID string) (*domain.StripePayment, error)
	Create(ctx context.Context, tx *gorm.DB, payment *domain.StripePayment) error
	UpdateStatus(ctx context.Context, tx *gorm.DB, id uint64, status string) error
	MarkAsReleased(ctx context.Context, tx *gorm.DB, id uint64, platformFee decimal.Decimal) error
}

type BookingRepository interface {
	GetByID(ctx context.Context, tx *gorm.DB, id uint64) (*booking.Booking, error)
	UpdatePaymentStatus(ctx context.Context, tx *gorm.DB, id uint64, status string) error
}

type ConnectRepository interface {
	GetByUserID(ctx context.Context, tx *gorm.DB, userID uint64) (*domain.UserStripeConnect, error)
	UpdateStatus(ctx context.Context, tx *gorm.DB, id uint64, status string) error
}

type WebhookIdempotencyRepository interface {
	Exists(ctx context.Context, eventID string) (bool, error)
	Create(ctx context.Context, record *domain.WebhookIdempotency) error
}

// StripeUseCase implements the Stripe Connect payment flow.
type StripeUseCase struct {
	db                 *gorm.DB
	stripeClient       StripeClient
	paymentRepo        PaymentRepository
	bookingRepo        BookingRepository
	connectRepo        ConnectRepository
	idempotencyRepo    WebhookIdempotencyRepository
}

// NewStripeUseCase creates a new Stripe use case.
func NewStripeUseCase(
	db *gorm.DB,
	stripeClient StripeClient,
	paymentRepo PaymentRepository,
	bookingRepo BookingRepository,
	connectRepo ConnectRepository,
	idempotencyRepo WebhookIdempotencyRepository,
) *StripeUseCase {
	return &StripeUseCase{
		db:              db,
		stripeClient:    stripeClient,
		paymentRepo:     paymentRepo,
		bookingRepo:     bookingRepo,
		connectRepo:     connectRepo,
		idempotencyRepo: idempotencyRepo,
	}
}

// CalculatePlatformFee computes the 12% LifeRise platform fee.
func (uc *StripeUseCase) CalculatePlatformFee(amount decimal.Decimal) decimal.Decimal {
	return amount.Mul(decimal.NewFromFloat(PlatformFeePercent)).Div(decimal.NewFromInt(100))
}

// CreatePaymentIntent initializes a Stripe PaymentIntent for a booking.
func (uc *StripeUseCase) CreatePaymentIntent(ctx context.Context, bookingID uint64, params *stripe.PaymentIntentParams) (*stripe.PaymentIntent, error) {
	var pi *stripe.PaymentIntent

	err := uc.db.Transaction(func(tx *gorm.DB) error {
		bk, err := uc.bookingRepo.GetByID(ctx, tx, bookingID)
		if err != nil {
			return fmt.Errorf("fetch booking: %w", err)
		}
		if bk.Status == string(booking.BookingStatusCancelled) {
			return fmt.Errorf("booking is cancelled")
		}

		// Set platform fee (12%) on the PaymentIntent
		platformFee := uc.CalculatePlatformFee(bk.FinalPrice)
		applicationFeeAmount := platformFee.Mul(decimal.NewFromInt(100)).IntPart() // cents

		if params.ApplicationFeeAmount == nil {
			params.ApplicationFeeAmount = stripe.Int64(applicationFeeAmount)
		}
		if params.TransferGroup == nil {
			params.TransferGroup = stripe.String(fmt.Sprintf("booking_%d", bookingID))
		}

		pi, err = uc.stripeClient.CreatePaymentIntent(ctx, params)
		if err != nil {
			return fmt.Errorf("stripe create payment intent: %w", err)
		}

		payment := &domain.StripePayment{
			BookingID:             &bookingID,
			StripePaymentIntentID: pi.ID,
			Amount:                bk.FinalPrice,
			Currency:              bk.Currency,
			Status:                string(pi.Status),
			PlatformFee:           &platformFee,
		}
		if bk.CustomerID != 0 {
			payment.CustomerID = &bk.CustomerID
		}

		if err := uc.paymentRepo.Create(ctx, tx, payment); err != nil {
			return fmt.Errorf("store payment: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return pi, nil
}

// ReleasePayment transfers funds to the vendor minus the 12% platform fee.
func (uc *StripeUseCase) ReleasePayment(ctx context.Context, bookingID uint64) error {
	return uc.db.Transaction(func(tx *gorm.DB) error {
		payment, err := uc.paymentRepo.GetByBookingID(ctx, tx, bookingID)
		if err != nil {
			return fmt.Errorf("fetch payment: %w", err)
		}
		if payment.Status != "succeeded" {
			return fmt.Errorf("payment not succeeded")
		}
		if payment.ReleasedAt != nil {
			return fmt.Errorf("payment already released")
		}

		bk, err := uc.bookingRepo.GetByID(ctx, tx, bookingID)
		if err != nil {
			return fmt.Errorf("fetch booking: %w", err)
		}

		providerConnect, err := uc.connectRepo.GetByUserID(ctx, tx, bk.ServiceProviderID)
		if err != nil {
			return fmt.Errorf("fetch connect account: %w", err)
		}
		if providerConnect.Status != "active" {
			return fmt.Errorf("provider connect account not active")
		}

		platformFee := uc.CalculatePlatformFee(payment.Amount)
		vendorAmount := payment.Amount.Sub(platformFee)

		// Transfer to vendor's Connect account
		_, err = uc.stripeClient.CreateTransfer(ctx, &stripe.TransferParams{
			Amount:        stripe.Int64(vendorAmount.Mul(decimal.NewFromInt(100)).IntPart()), // cents
			Currency:      stripe.String(payment.Currency),
			Destination:   stripe.String(providerConnect.StripeAccountID),
			TransferGroup: stripe.String(fmt.Sprintf("booking_%d", bookingID)),
		})
		if err != nil {
			return fmt.Errorf("transfer to vendor failed: %w", err)
		}

		// Platform fee is captured automatically via Stripe Connect application_fee_amount
		return uc.paymentRepo.MarkAsReleased(ctx, tx, payment.ID, platformFee)
	})
}

// ConfirmPaymentIntent confirms a Stripe PaymentIntent after client-side authorization.
func (uc *StripeUseCase) ConfirmPaymentIntent(ctx context.Context, id string, params *stripe.PaymentIntentConfirmParams) (*stripe.PaymentIntent, error) {
	pi, err := uc.stripeClient.ConfirmPaymentIntent(ctx, id, params)
	if err != nil {
		return nil, fmt.Errorf("confirm payment intent: %w", err)
	}

	// Update local payment record status
	if pi.ID != "" {
		_ = uc.db.Transaction(func(tx *gorm.DB) error {
			p, err := uc.paymentRepo.GetByPaymentIntentID(ctx, tx, pi.ID)
			if err != nil {
				return err // silent fail for status sync
			}
			return uc.paymentRepo.UpdateStatus(ctx, tx, p.ID, string(pi.Status))
		})
	}

	return pi, nil
}

// ProcessRefund handles full or partial refunds.
func (uc *StripeUseCase) ProcessRefund(ctx context.Context, paymentID uint64, amount *decimal.Decimal, reason *string) (*stripe.Refund, error) {
	var refund *stripe.Refund

	err := uc.db.Transaction(func(tx *gorm.DB) error {
		payment, err := uc.paymentRepo.GetByID(ctx, tx, paymentID)
		if err != nil {
			return fmt.Errorf("fetch payment: %w", err)
		}

		params := &stripe.RefundParams{
			PaymentIntent: stripe.String(payment.StripePaymentIntentID),
		}
		if amount != nil {
			params.Amount = stripe.Int64(amount.Mul(decimal.NewFromInt(100)).IntPart())
		}
		if reason != nil {
			params.Reason = stripe.String(*reason)
		}

		refund, err = uc.stripeClient.CreateRefund(ctx, params)
		if err != nil {
			return fmt.Errorf("stripe refund failed: %w", err)
		}

		// Update payment status if fully refunded
		if amount == nil || amount.Equal(payment.Amount) {
			_ = uc.paymentRepo.UpdateStatus(ctx, tx, paymentID, "refunded")
			if payment.BookingID != nil {
				_ = uc.bookingRepo.UpdatePaymentStatus(ctx, tx, *payment.BookingID, "refunded")
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return refund, nil
}
