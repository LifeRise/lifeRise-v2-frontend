package integration

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"gorm.io/gorm"

	apppayment "github.com/liferise/backend/internal/application/payment"
	"github.com/liferise/backend/internal/domain/booking"
	"github.com/liferise/backend/internal/domain/payment"
)

// ── Fake Payment Repo ──────────────────────────────────────────

type fakePaymentRepo struct {
	mu       sync.RWMutex
	payments map[uint64]*payment.StripePayment
	byPI     map[string]*payment.StripePayment
	nextID   uint64
}

func newFakePaymentRepo() *fakePaymentRepo {
	return &fakePaymentRepo{
		payments: make(map[uint64]*payment.StripePayment),
		byPI:     make(map[string]*payment.StripePayment),
		nextID:   1,
	}
}

func (r *fakePaymentRepo) GetByBookingID(_ context.Context, _ *gorm.DB, bookingID uint64) (*payment.StripePayment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, p := range r.payments {
		if p.BookingID != nil && *p.BookingID == bookingID {
			return p, nil
		}
	}
	return nil, assert.AnError
}

func (r *fakePaymentRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*payment.StripePayment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.payments[id]
	if !ok {
		return nil, assert.AnError
	}
	return p, nil
}

func (r *fakePaymentRepo) GetByPaymentIntentID(_ context.Context, _ *gorm.DB, piID string) (*payment.StripePayment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	p, ok := r.byPI[piID]
	if !ok {
		return nil, assert.AnError
	}
	return p, nil
}

func (r *fakePaymentRepo) Create(_ context.Context, _ *gorm.DB, p *payment.StripePayment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	p.ID = r.nextID
	r.nextID++
	r.payments[p.ID] = p
	r.byPI[p.StripePaymentIntentID] = p
	return nil
}

func (r *fakePaymentRepo) UpdateStatus(_ context.Context, _ *gorm.DB, id uint64, status string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p, ok := r.payments[id]; ok {
		p.Status = status
	}
	return nil
}

func (r *fakePaymentRepo) MarkAsReleased(_ context.Context, _ *gorm.DB, id uint64, platformFee decimal.Decimal) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p, ok := r.payments[id]; ok {
		p.Status = "released"
		p.PlatformFee = &platformFee
		now := time.Now().UTC()
		p.ReleasedAt = &now
	}
	return nil
}

// ── Fake Booking Repo ──────────────────────────────────────────

type fakeStripeBookingRepo struct {
	mu       sync.RWMutex
	bookings map[uint64]*booking.Booking
	nextID   uint64
}

func newFakeStripeBookingRepo() *fakeStripeBookingRepo {
	return &fakeStripeBookingRepo{
		bookings: make(map[uint64]*booking.Booking),
		nextID:   1,
	}
}

func (r *fakeStripeBookingRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*booking.Booking, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	b, ok := r.bookings[id]
	if !ok {
		return nil, assert.AnError
	}
	return b, nil
}

func (r *fakeStripeBookingRepo) Create(_ context.Context, _ *gorm.DB, b *booking.Booking) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	b.ID = r.nextID
	r.nextID++
	r.bookings[b.ID] = b
	return nil
}

func (r *fakeStripeBookingRepo) UpdateStatus(_ context.Context, _ *gorm.DB, id uint64, status string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if b, ok := r.bookings[id]; ok {
		b.Status = status
	}
	return nil
}

func (r *fakeStripeBookingRepo) UpdatePaymentStatus(_ context.Context, _ *gorm.DB, id uint64, paymentStatus string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if b, ok := r.bookings[id]; ok {
		b.PaymentStatus = paymentStatus
	}
	return nil
}

// ── Fake Connect Repo ──────────────────────────────────────────

type fakeConnectRepo struct {
	mu       sync.RWMutex
	connects map[uint64]*payment.UserStripeConnect
	nextID   uint64
}

func newFakeConnectRepo() *fakeConnectRepo {
	return &fakeConnectRepo{
		connects: make(map[uint64]*payment.UserStripeConnect),
		nextID:   1,
	}
}

func (r *fakeConnectRepo) GetByUserID(_ context.Context, _ *gorm.DB, userID uint64) (*payment.UserStripeConnect, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for _, c := range r.connects {
		if c.UserID == userID {
			return c, nil
		}
	}
	return nil, assert.AnError
}

func (r *fakeConnectRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*payment.UserStripeConnect, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.connects[id]
	if !ok {
		return nil, assert.AnError
	}
	return c, nil
}

func (r *fakeConnectRepo) Create(_ context.Context, _ *gorm.DB, c *payment.UserStripeConnect) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c.ID = r.nextID
	r.nextID++
	r.connects[c.ID] = c
	return nil
}

func (r *fakeConnectRepo) UpdateStatus(_ context.Context, _ *gorm.DB, id uint64, status string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if c, ok := r.connects[id]; ok {
		c.Status = status
	}
	return nil
}

// ── Fake Stripe Client ─────────────────────────────────────────

type fakeStripeClient struct {
	mu             sync.Mutex
	transfers      []*fakeTransfer
	refunds        []*fakeRefund
	paymentIntents map[string]*fakePaymentIntent
}

type fakeTransfer struct {
	Amount        int64
	Currency      string
	Destination   string
	TransferGroup string
}

type fakeRefund struct {
	Amount        int64
	PaymentIntent string
	Reason        string
}

type fakePaymentIntent struct {
	ID     string
	Amount int64
	Status string
}

func newFakeStripeClient() *fakeStripeClient {
	return &fakeStripeClient{
		paymentIntents: make(map[string]*fakePaymentIntent),
	}
}

func (c *fakeStripeClient) CreatePaymentIntent(_ context.Context, params interface{}) (interface{}, error) {
	return nil, nil // stub; not used in these tests directly
}

func (c *fakeStripeClient) ConfirmPaymentIntent(_ context.Context, id string, params interface{}) (interface{}, error) {
	return nil, nil
}

func (c *fakeStripeClient) CreateRefund(_ context.Context, params interface{}) (interface{}, error) {
	return nil, nil
}

func (c *fakeStripeClient) CreateTransfer(_ context.Context, params interface{}) (interface{}, error) {
	return nil, nil
}

func (c *fakeStripeClient) GetAccount(_ context.Context, id string, params interface{}) (interface{}, error) {
	return nil, nil
}

// ── Tests ──────────────────────────────────────────────────────

func TestStripeUseCase_CalculatePlatformFee(t *testing.T) {
	uc := &apppayment.StripeUseCase{}

	tests := []struct {
		amount   string
		expected string
	}{
		{"100.00", "12.00"},
		{"50.00", "6.00"},
		{"99.99", "11.9988"},
		{"1000.00", "120.00"},
		{"0.00", "0.00"},
	}

	for _, tt := range tests {
		amount, _ := decimal.NewFromString(tt.amount)
		expected, _ := decimal.NewFromString(tt.expected)
		fee := uc.CalculatePlatformFee(amount)
		assert.True(t, fee.Equal(expected), "expected %s but got %s", expected.String(), fee.String())
	}
}

func TestStripeUseCase_PlatformFeePercentConstant(t *testing.T) {
	assert.Equal(t, 12.0, apppayment.PlatformFeePercent)
}
