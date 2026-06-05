package persistence

import (
	"context"
	"errors"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/payment"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// PaymentRepo implements payment.Repository with GORM.
type PaymentRepo struct{}

// NewPaymentRepo creates a new PaymentRepo.
func NewPaymentRepo() *PaymentRepo { return &PaymentRepo{} }

func (r *PaymentRepo) GetByBookingID(ctx context.Context, db *gorm.DB, bookingID uint64) (*payment.StripePayment, error) {
	var p payment.StripePayment
	if err := db.WithContext(ctx).Where("booking_id = ?", bookingID).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *PaymentRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*payment.StripePayment, error) {
	var p payment.StripePayment
	if err := db.WithContext(ctx).First(&p, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *PaymentRepo) GetByPaymentIntentID(ctx context.Context, db *gorm.DB, piID string) (*payment.StripePayment, error) {
	var p payment.StripePayment
	if err := db.WithContext(ctx).Where("stripe_payment_intent_id = ?", piID).First(&p).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &p, nil
}

func (r *PaymentRepo) Create(ctx context.Context, db *gorm.DB, p *payment.StripePayment) error {
	return db.WithContext(ctx).Create(p).Error
}

func (r *PaymentRepo) UpdateStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error {
	return db.WithContext(ctx).Model(&payment.StripePayment{}).Where("id = ?", id).Update("status", status).Error
}

func (r *PaymentRepo) MarkAsReleased(ctx context.Context, db *gorm.DB, id uint64, platformFee decimal.Decimal) error {
	now := time.Now().UTC()
	return db.WithContext(ctx).Model(&payment.StripePayment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":        "released",
		"platform_fee":  platformFee,
		"released_at":   &now,
	}).Error
}

// ConnectRepo implements payment.ConnectRepository with GORM.
type ConnectRepo struct{}

// NewConnectRepo creates a new ConnectRepo.
func NewConnectRepo() *ConnectRepo { return &ConnectRepo{} }

func (r *ConnectRepo) GetByUserID(ctx context.Context, db *gorm.DB, userID uint64) (*payment.UserStripeConnect, error) {
	var c payment.UserStripeConnect
	if err := db.WithContext(ctx).Where("user_id = ?", userID).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *ConnectRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*payment.UserStripeConnect, error) {
	var c payment.UserStripeConnect
	if err := db.WithContext(ctx).First(&c, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *ConnectRepo) Create(ctx context.Context, db *gorm.DB, c *payment.UserStripeConnect) error {
	return db.WithContext(ctx).Create(c).Error
}

func (r *ConnectRepo) UpdateStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error {
	return db.WithContext(ctx).Model(&payment.UserStripeConnect{}).Where("id = ?", id).Update("status", status).Error
}

// WebhookIdempotencyRepo implements payment.WebhookIdempotencyRepository with GORM.
type WebhookIdempotencyRepo struct{}

// NewWebhookIdempotencyRepo creates a new WebhookIdempotencyRepo.
func NewWebhookIdempotencyRepo() *WebhookIdempotencyRepo { return &WebhookIdempotencyRepo{} }

func (r *WebhookIdempotencyRepo) Exists(ctx context.Context, eventID string) (bool, error) {
	// This method requires a *gorm.DB instance; in practice it should be called
	// with the same transaction as the business logic. For now we return false
	// to allow the adapter layer to handle the DB injection.
	return false, nil
}

func (r *WebhookIdempotencyRepo) Create(ctx context.Context, record *payment.WebhookIdempotency) error {
	// Same note as above; the adapter should pass db.
	return nil
}
