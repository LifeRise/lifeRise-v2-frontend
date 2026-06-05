package integration

import (
	"context"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	appbooking "github.com/liferise/backend/internal/application/booking"
	"github.com/liferise/backend/internal/domain/booking"
	"github.com/liferise/backend/internal/domain/service"
)

// ── Fake Service Repo (Booking context) ────────────────────────

type fakeServiceRepoForBooking struct {
	services map[uint64]*service.Service
}

func newFakeServiceRepoForBooking() *fakeServiceRepoForBooking {
	return &fakeServiceRepoForBooking{services: make(map[uint64]*service.Service)}
}

func (r *fakeServiceRepoForBooking) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*service.Service, error) {
	s, ok := r.services[id]
	if !ok {
		return nil, assert.AnError
	}
	return s, nil
}

func (r *fakeServiceRepoForBooking) GetBySlug(_ context.Context, _ *gorm.DB, slug string) (*service.Service, error) {
	return nil, assert.AnError
}

func (r *fakeServiceRepoForBooking) List(_ context.Context, _ *gorm.DB, filter service.ListFilter) ([]service.Service, int64, error) {
	return nil, 0, nil
}

func (r *fakeServiceRepoForBooking) Create(_ context.Context, _ *gorm.DB, s *service.Service) error {
	r.services[s.ID] = s
	return nil
}

func (r *fakeServiceRepoForBooking) Update(_ context.Context, _ *gorm.DB, s *service.Service) error {
	r.services[s.ID] = s
	return nil
}

func (r *fakeServiceRepoForBooking) Delete(_ context.Context, _ *gorm.DB, id uint64) error {
	delete(r.services, id)
	return nil
}

func (r *fakeServiceRepoForBooking) GetCategoryBySlug(_ context.Context, _ *gorm.DB, slug string) (*service.ServiceCategory, error) {
	return nil, assert.AnError
}

func (r *fakeServiceRepoForBooking) ListCategories(_ context.Context, _ *gorm.DB) ([]service.ServiceCategory, error) {
	return nil, nil
}

// ── Fake Slot Repo ─────────────────────────────────────────────

type fakeSlotRepo struct {
	slots map[uint64]*booking.AvailableSlot
}

func newFakeSlotRepo() *fakeSlotRepo {
	return &fakeSlotRepo{slots: make(map[uint64]*booking.AvailableSlot)}
}

func (r *fakeSlotRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*booking.AvailableSlot, error) {
	s, ok := r.slots[id]
	if !ok {
		return nil, assert.AnError
	}
	return s, nil
}

func (r *fakeSlotRepo) ListAvailable(_ context.Context, _ *gorm.DB, providerID uint64, date time.Time) ([]booking.AvailableSlot, error) {
	var result []booking.AvailableSlot
	for _, s := range r.slots {
		if s.ServiceProviderID == providerID && s.IsAvailable && s.BookedByBookingID == nil {
			result = append(result, *s)
		}
	}
	return result, nil
}

func (r *fakeSlotRepo) LockSlot(_ context.Context, _ *gorm.DB, slotID uint64, bookingID uint64) error {
	s, ok := r.slots[slotID]
	if !ok || !s.IsAvailable || s.BookedByBookingID != nil {
		return assert.AnError
	}
	s.IsAvailable = false
	s.BookedByBookingID = &bookingID
	return nil
}

func (r *fakeSlotRepo) UnlockSlot(_ context.Context, _ *gorm.DB, slotID uint64) error {
	s, ok := r.slots[slotID]
	if !ok {
		return assert.AnError
	}
	s.IsAvailable = true
	s.BookedByBookingID = nil
	return nil
}

func (r *fakeSlotRepo) Create(_ context.Context, _ *gorm.DB, slot *booking.AvailableSlot) error {
	r.slots[slot.ID] = slot
	return nil
}

// ── Fake Booking Repo ──────────────────────────────────────────

type fakeBookingRepo struct {
	bookings map[uint64]*booking.Booking
	nextID   uint64
}

func newFakeBookingRepo() *fakeBookingRepo {
	return &fakeBookingRepo{bookings: make(map[uint64]*booking.Booking), nextID: 1}
}

func (r *fakeBookingRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*booking.Booking, error) {
	b, ok := r.bookings[id]
	if !ok {
		return nil, assert.AnError
	}
	return b, nil
}

func (r *fakeBookingRepo) GetByBookingNumber(_ context.Context, _ *gorm.DB, number string) (*booking.Booking, error) {
	return nil, assert.AnError
}

func (r *fakeBookingRepo) ListByCustomer(_ context.Context, _ *gorm.DB, customerID uint64, status string, page, perPage int) ([]booking.Booking, int64, error) {
	var result []booking.Booking
	for _, b := range r.bookings {
		if b.CustomerID == customerID {
			if status == "" || b.Status == status {
				result = append(result, *b)
			}
		}
	}
	return result, int64(len(result)), nil
}

func (r *fakeBookingRepo) ListByProvider(_ context.Context, _ *gorm.DB, providerID uint64, status string, page, perPage int) ([]booking.Booking, int64, error) {
	var result []booking.Booking
	for _, b := range r.bookings {
		if b.ServiceProviderID == providerID {
			if status == "" || b.Status == status {
				result = append(result, *b)
			}
		}
	}
	return result, int64(len(result)), nil
}

func (r *fakeBookingRepo) Create(_ context.Context, _ *gorm.DB, b *booking.Booking) error {
	b.ID = r.nextID
	r.nextID++
	r.bookings[b.ID] = b
	return nil
}

func (r *fakeBookingRepo) UpdateStatus(_ context.Context, _ *gorm.DB, id uint64, status string) error {
	if b, ok := r.bookings[id]; ok {
		b.Status = status
	}
	return nil
}

func (r *fakeBookingRepo) UpdatePaymentStatus(_ context.Context, _ *gorm.DB, id uint64, status string) error {
	if b, ok := r.bookings[id]; ok {
		b.PaymentStatus = status
	}
	return nil
}

func (r *fakeBookingRepo) SoftDelete(_ context.Context, _ *gorm.DB, id uint64) error {
	delete(r.bookings, id)
	return nil
}

// ── Tests ──────────────────────────────────────────────────────

func setupBookingUC() (*appbooking.UseCase, *fakeBookingRepo, *fakeSlotRepo, *fakeServiceRepoForBooking) {
	bRepo := newFakeBookingRepo()
	sRepo := newFakeSlotRepo()
	svcRepo := newFakeServiceRepoForBooking()
	uc := appbooking.NewUseCase(nil, bRepo, sRepo, svcRepo)
	return uc, bRepo, sRepo, svcRepo
}

func TestBookingUseCase_CreateBooking(t *testing.T) {
	uc, _, sRepo, svcRepo := setupBookingUC()
	ctx := context.Background()

	// Seed service
	svc := &service.Service{
		ID:         1,
		ProviderID: 1,
		Name:       "Test Service",
		Price:      decimal.NewFromFloat(100),
		Currency:   "USD",
		Duration:   60,
	}
	svcRepo.services[1] = svc

	// Seed slot
	slot := &booking.AvailableSlot{
		ID:                1,
		ServiceProviderID: 1,
		IsAvailable:       true,
	}
	sRepo.slots[1] = slot

	date := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	start := time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC)
	end := time.Date(2026, 6, 1, 11, 0, 0, 0, time.UTC)

	b, err := uc.CreateBooking(ctx, appbooking.CreateBookingRequest{
		CustomerID:        1,
		ServiceID:         1,
		ServiceProviderID: 1,
		SlotID:            1,
		BookingDate:       date,
		StartTime:         start,
		EndTime:           end,
	})
	require.NoError(t, err)
	assert.NotZero(t, b.ID)
	assert.Equal(t, "Pending", b.Status)
	assert.True(t, b.Price.Equal(decimal.NewFromFloat(100)))
	assert.Equal(t, 60, b.Duration)

	// Slot should be locked
	lockedSlot := sRepo.slots[1]
	assert.False(t, lockedSlot.IsAvailable)
	assert.NotNil(t, lockedSlot.BookedByBookingID)
	assert.Equal(t, b.ID, *lockedSlot.BookedByBookingID)
}

func TestBookingUseCase_CreateBooking_SlotUnavailable(t *testing.T) {
	uc, _, sRepo, svcRepo := setupBookingUC()
	ctx := context.Background()

	svcRepo.services[1] = &service.Service{ID: 1, ProviderID: 1, Price: decimal.NewFromFloat(50)}
	sRepo.slots[1] = &booking.AvailableSlot{ID: 1, ServiceProviderID: 1, IsAvailable: false}

	_, err := uc.CreateBooking(ctx, appbooking.CreateBookingRequest{
		CustomerID:        1,
		ServiceID:         1,
		ServiceProviderID: 1,
		SlotID:            1,
		BookingDate:       time.Now(),
		StartTime:         time.Now(),
		EndTime:           time.Now().Add(time.Hour),
	})
	assert.Error(t, err)
}

func TestBookingUseCase_StatusTransitions(t *testing.T) {
	uc, bRepo, _, _ := setupBookingUC()
	ctx := context.Background()

	// Seed a booking
	b := &booking.Booking{ID: 1, CustomerID: 1, Status: string(booking.BookingStatusPending)}
	bRepo.bookings[1] = b

	// Pending -> Confirmed
	updated, err := uc.UpdateStatus(ctx, appbooking.UpdateStatusRequest{
		BookingID: 1,
		NewStatus: booking.BookingStatusConfirmed,
		UserID:    1,
		UserType:  "provider",
	})
	require.NoError(t, err)
	assert.Equal(t, "Confirmed", updated.Status)
	assert.NotNil(t, updated.ConfirmedAt)

	// Confirmed -> Completed
	updated, err = uc.UpdateStatus(ctx, appbooking.UpdateStatusRequest{
		BookingID: 1,
		NewStatus: booking.BookingStatusCompleted,
		UserID:    1,
		UserType:  "provider",
	})
	require.NoError(t, err)
	assert.Equal(t, "Completed", updated.Status)
	assert.NotNil(t, updated.CompletedAt)

	// Completed -> Cancelled (invalid)
	_, err = uc.UpdateStatus(ctx, appbooking.UpdateStatusRequest{
		BookingID: 1,
		NewStatus: booking.BookingStatusCancelled,
		UserID:    1,
		UserType:  "admin",
	})
	assert.Error(t, err)
}

func TestBookingUseCase_CancelBooking(t *testing.T) {
	uc, bRepo, sRepo, _ := setupBookingUC()
	ctx := context.Background()

	b := &booking.Booking{ID: 1, CustomerID: 1, Status: string(booking.BookingStatusConfirmed)}
	bRepo.bookings[1] = b
	sRepo.slots[1] = &booking.AvailableSlot{ID: 1, ServiceProviderID: 1, IsAvailable: false, BookedByBookingID: func() *uint64 { u := uint64(1); return &u }()}

	reason := "Customer request"
	updated, err := uc.UpdateStatus(ctx, appbooking.UpdateStatusRequest{
		BookingID: 1,
		NewStatus: booking.BookingStatusCancelled,
		UserID:    1,
		UserType:  "customer",
		Reason:    &reason,
	})
	require.NoError(t, err)
	assert.Equal(t, "Cancelled", updated.Status)
	assert.NotNil(t, updated.CancelledAt)
	assert.Equal(t, &reason, updated.CancellationReason)
	assert.Equal(t, "customer", *updated.CancelledBy)

	// Slot should be unlocked
	assert.True(t, sRepo.slots[1].IsAvailable)
	assert.Nil(t, sRepo.slots[1].BookedByBookingID)
}

func TestBookingUseCase_RescheduleBooking(t *testing.T) {
	uc, bRepo, sRepo, svcRepo := setupBookingUC()
	ctx := context.Background()

	svcRepo.services[1] = &service.Service{ID: 1, ProviderID: 1, Price: decimal.NewFromFloat(75)}
	bRepo.bookings[1] = &booking.Booking{
		ID:                1,
		CustomerID:        1,
		ServiceProviderID: 1,
		ServiceID:         1,
		Status:            string(booking.BookingStatusConfirmed),
		BookingDate:       time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
		StartTime:         time.Date(2026, 6, 1, 10, 0, 0, 0, time.UTC),
		EndTime:           time.Date(2026, 6, 1, 11, 0, 0, 0, time.UTC),
	}
	sRepo.slots[1] = &booking.AvailableSlot{ID: 1, ServiceProviderID: 1, IsAvailable: false, BookedByBookingID: func() *uint64 { u := uint64(1); return &u }()}
	sRepo.slots[2] = &booking.AvailableSlot{ID: 2, ServiceProviderID: 1, IsAvailable: true}

	newDate := time.Date(2026, 6, 2, 0, 0, 0, 0, time.UTC)
	newStart := time.Date(2026, 6, 2, 14, 0, 0, 0, time.UTC)
	newEnd := time.Date(2026, 6, 2, 15, 0, 0, 0, time.UTC)

	updated, err := uc.RescheduleBooking(ctx, appbooking.RescheduleBookingRequest{
		BookingID:    1,
		NewSlotID:    2,
		NewDate:      newDate,
		NewStartTime: newStart,
		NewEndTime:   newEnd,
		Reason:       "Changed mind",
		UserID:       1,
	})
	require.NoError(t, err)
	assert.Equal(t, newDate, updated.BookingDate)
	assert.Equal(t, newStart, updated.StartTime)
	assert.Equal(t, newEnd, updated.EndTime)

	// Old slot unlocked
	assert.True(t, sRepo.slots[1].IsAvailable)
	// New slot locked
	assert.False(t, sRepo.slots[2].IsAvailable)
}
