package payment

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// StripePayment tracks a Stripe PaymentIntent lifecycle.
type StripePayment struct {
	ID                    uint64           `gorm:"column:id;primaryKey"`
	BookingID             *uint64          `gorm:"column:booking_id;index"`
	CustomerID            *uint64          `gorm:"column:customer_id;index"`
	UserID                *uint64          `gorm:"column:user_id;index"`
	StripePaymentIntentID string           `gorm:"column:stripe_payment_intent_id;size:255;uniqueIndex"`
	StripeChargeID        *string          `gorm:"column:stripe_charge_id;size:255"`
	Amount                decimal.Decimal  `gorm:"column:amount;type:decimal(10,2)"`
	Currency              string           `gorm:"column:currency;size:3;default:'USD'"`
	Status                string           `gorm:"column:status;size:50"` // "requires_payment_method", "requires_confirmation", "succeeded", "canceled", "refunded"
	PlatformFee           *decimal.Decimal `gorm:"column:platform_fee;type:decimal(10,2)"`
	VendorAmount          *decimal.Decimal `gorm:"column:vendor_amount;type:decimal(10,2)"`
	ReleasedAt            *time.Time       `gorm:"column:released_at"`
	Description           string           `gorm:"column:description;type:text"`
	BillingDetails        datatypes.JSON   `gorm:"column:billing_details;type:jsonb"`
	Metadata              datatypes.JSON   `gorm:"column:metadata;type:jsonb"`
	FailureMessage        *string          `gorm:"column:failure_message;type:text"`
	CreatedAt             time.Time        `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt             time.Time        `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt             gorm.DeletedAt   `gorm:"column:deleted_at;index"`
}

func (StripePayment) TableName() string { return "stripe_payments" }

// UserStripeConnect tracks a vendor's Stripe Connect account onboarding.
type UserStripeConnect struct {
	ID                    uint64         `gorm:"column:id;primaryKey"`
	UserID                uint64         `gorm:"column:user_id;uniqueIndex;not null"`
	StripeAccountID       string         `gorm:"column:stripe_account_id;size:255;index;not null"`
	Status                string         `gorm:"column:status;size:50;default:'pending'"` // "pending", "active", "restricted", "disabled"
	ChargesEnabled        bool           `gorm:"column:charges_enabled;default:false"`
	PayoutsEnabled        bool           `gorm:"column:payouts_enabled;default:false"`
	RequirementsDue       datatypes.JSON `gorm:"column:requirements_due;type:jsonb"`
	Country               string         `gorm:"column:country;size:2"`
	DefaultCurrency       string         `gorm:"column:default_currency;size:3"`
	OnboardingLink        *string        `gorm:"column:onboarding_link;size:500"`
	OnboardingCompletedAt *time.Time     `gorm:"column:onboarding_completed_at"`
	CreatedAt             time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt             time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt             gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (UserStripeConnect) TableName() string { return "user_stripe_connects" }

// StripeRefund tracks refund records.
type StripeRefund struct {
	ID             uint64          `gorm:"column:id;primaryKey"`
	PaymentID      uint64          `gorm:"column:payment_id;not null;index"`
	StripeRefundID string          `gorm:"column:stripe_refund_id;size:255;uniqueIndex;not null"`
	Amount         decimal.Decimal `gorm:"column:amount;type:decimal(10,2)"`
	Reason         *string         `gorm:"column:reason;size:255"`
	Status         string          `gorm:"column:status;size:50"` // "pending", "succeeded", "failed"
	StripeResponse datatypes.JSON  `gorm:"column:stripe_response;type:jsonb"`
	CreatedAt      time.Time       `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time       `gorm:"column:updated_at;autoUpdateTime"`
}

func (StripeRefund) TableName() string { return "stripe_refunds" }

// WebhookIdempotency prevents duplicate Stripe webhook processing.
type WebhookIdempotency struct {
	ID          uint64    `gorm:"column:id;primaryKey"`
	EventID     string    `gorm:"column:event_id;size:255;uniqueIndex;not null"`
	EventType   string    `gorm:"column:event_type;size:100;not null"`
	ProcessedAt time.Time `gorm:"column:processed_at;not null"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (WebhookIdempotency) TableName() string { return "webhook_idempotencies" }
