package payment

import (
	"context"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Repository defines persistence for StripePayment aggregates.
type Repository interface {
	GetByBookingID(ctx context.Context, db *gorm.DB, bookingID uint64) (*StripePayment, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*StripePayment, error)
	GetByPaymentIntentID(ctx context.Context, db *gorm.DB, piID string) (*StripePayment, error)
	Create(ctx context.Context, db *gorm.DB, payment *StripePayment) error
	UpdateStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error
	MarkAsReleased(ctx context.Context, db *gorm.DB, id uint64, platformFee decimal.Decimal) error
}

// ConnectRepository defines persistence for UserStripeConnect.
type ConnectRepository interface {
	GetByUserID(ctx context.Context, db *gorm.DB, userID uint64) (*UserStripeConnect, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*UserStripeConnect, error)
	Create(ctx context.Context, db *gorm.DB, connect *UserStripeConnect) error
	UpdateStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error
}

// WebhookIdempotencyRepository defines persistence for webhook idempotency records.
type WebhookIdempotencyRepository interface {
	Exists(ctx context.Context, eventID string) (bool, error)
	Create(ctx context.Context, record *WebhookIdempotency) error
}
