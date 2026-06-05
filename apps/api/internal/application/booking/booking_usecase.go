package booking

import (
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/booking"
	domainService "github.com/liferise/backend/internal/domain/service"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// UseCase handles booking operations.
type UseCase struct {
	db         *gorm.DB
	bookingRepo booking.Repository
	slotRepo    booking.SlotRepository
	serviceRepo domainService.Repository
}

// NewUseCase creates a new booking UseCase.
func NewUseCase(
	db *gorm.DB,
	bookingRepo booking.Repository,
	slotRepo booking.SlotRepository,
	serviceRepo domainService.Repository,
) *UseCase {
	return &UseCase{
		db:          db,
		bookingRepo: bookingRepo,
		slotRepo:    slotRepo,
		serviceRepo: serviceRepo,
	}
}

// CreateBookingRequest holds parameters for creating a booking.
type CreateBookingRequest struct {
	CustomerID        uint64
	ServiceID         uint64
	ServiceProviderID uint64
	SlotID            uint64
	BookingDate       time.Time
	StartTime         time.Time
	EndTime           time.Time
	Notes             *string
	PromoCodeID       *uint64
}

// CreateBooking creates a new booking with slot locking.
func (uc *UseCase) withTx(fn func(*gorm.DB) error) error {
	if uc.db == nil {
		return fn(nil)
	}
	return uc.db.Transaction(fn)
}

func (uc *UseCase) CreateBooking(ctx context.Context, req CreateBookingRequest) (*booking.Booking, error) {
	var b *booking.Booking

	err := uc.withTx(func(tx *gorm.DB) error {
		// 1. Verify service exists and belongs to provider
		svc, err := uc.serviceRepo.GetByID(ctx, tx, req.ServiceID)
		if err != nil {
			return fmt.Errorf("service not found: %w", err)
		}
		if svc.ProviderID != req.ServiceProviderID {
			return fmt.Errorf("service does not belong to provider")
		}

		// 2. Lock the slot (SELECT FOR UPDATE equivalent via GORM optimistic lock)
		slot, err := uc.slotRepo.GetByID(ctx, tx, req.SlotID)
		if err != nil {
			return fmt.Errorf("slot not found: %w", err)
		}
		if !slot.IsAvailable || slot.BookedByBookingID != nil {
			return apperrors.ErrSlotUnavailable
		}

		// 3. Create booking
		bookingNumber := generateBookingNumber()
		duration := int(req.EndTime.Sub(req.StartTime).Minutes())

		b = &booking.Booking{
			BookingNumber:     bookingNumber,
			CustomerID:        req.CustomerID,
			ServiceProviderID: req.ServiceProviderID,
			ServiceID:         req.ServiceID,
			Status:            string(booking.BookingStatusPending),
			BookingDate:       req.BookingDate,
			StartTime:         req.StartTime,
			EndTime:           req.EndTime,
			Duration:          duration,
			Price:             svc.Price,
			FinalPrice:        svc.Price,
			Currency:          svc.Currency,
			Notes:             req.Notes,
			PaymentStatus:     "pending",
		}

		if err := uc.bookingRepo.Create(ctx, tx, b); err != nil {
			return fmt.Errorf("create booking: %w", err)
		}

		// 4. Lock slot to booking
		if err := uc.slotRepo.LockSlot(ctx, tx, req.SlotID, b.ID); err != nil {
			return fmt.Errorf("lock slot: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return b, nil
}

// UpdateStatusRequest holds a status transition.
type UpdateStatusRequest struct {
	BookingID uint64
	NewStatus booking.BookingStatus
	UserID    uint64
	UserType  string // "customer" | "provider" | "admin"
	Reason    *string
}

// UpdateStatus transitions a booking through its state machine.
func (uc *UseCase) UpdateStatus(ctx context.Context, req UpdateStatusRequest) (*booking.Booking, error) {
	if !req.NewStatus.Valid() {
		return nil, fmt.Errorf("invalid status: %s", req.NewStatus)
	}

	b, err := uc.bookingRepo.GetByID(ctx, uc.db, req.BookingID)
	if err != nil {
		return nil, err
	}

	currentStatus := booking.BookingStatus(b.Status)

	// Validate transition
	if !isValidTransition(currentStatus, req.NewStatus, req.UserType) {
		return nil, fmt.Errorf("invalid status transition from %s to %s for %s", currentStatus, req.NewStatus, req.UserType)
	}

	// Apply transition side effects
	now := time.Now().UTC()
	switch req.NewStatus {
	case booking.BookingStatusConfirmed:
		b.ConfirmedAt = &now
	case booking.BookingStatusCompleted:
		b.CompletedAt = &now
	case booking.BookingStatusCancelled:
		b.CancelledAt = &now
		b.CancelledBy = &req.UserType
		b.CancellationReason = req.Reason
		// Unlock slot on cancellation
		_ = uc.slotRepo.UnlockSlot(ctx, uc.db, req.BookingID)
	}

	b.Status = string(req.NewStatus)
	if err := uc.bookingRepo.UpdateStatus(ctx, uc.db, b.ID, b.Status); err != nil {
		return nil, err
	}

	return b, nil
}

// RescheduleBooking moves a booking to a new slot.
type RescheduleBookingRequest struct {
	BookingID   uint64
	NewSlotID   uint64
	NewDate     time.Time
	NewStartTime time.Time
	NewEndTime  time.Time
	Reason      string
	UserID      uint64
}

// RescheduleBooking reschedules a booking to a new slot.
func (uc *UseCase) RescheduleBooking(ctx context.Context, req RescheduleBookingRequest) (*booking.Booking, error) {
	var result *booking.Booking

	err := uc.withTx(func(tx *gorm.DB) error {
		b, err := uc.bookingRepo.GetByID(ctx, tx, req.BookingID)
		if err != nil {
			return err
		}

		// Record reschedule
		record := &booking.BookingRescheduleRecord{
			BookingID:     b.ID,
			OldDate:       b.BookingDate,
			NewDate:       req.NewDate,
			OldStartTime:  b.StartTime,
			NewStartTime:  req.NewStartTime,
			OldEndTime:    b.EndTime,
			NewEndTime:    req.NewEndTime,
			RescheduledBy: req.UserID,
			Reason:        &req.Reason,
		}
		if tx != nil {
			if err := tx.Create(record).Error; err != nil {
				return fmt.Errorf("record reschedule: %w", err)
			}
		}

		// Unlock old slot
		_ = uc.slotRepo.UnlockSlot(ctx, tx, req.BookingID)

		// Lock new slot
		if err := uc.slotRepo.LockSlot(ctx, tx, req.NewSlotID, b.ID); err != nil {
			return fmt.Errorf("lock new slot: %w", err)
		}

		// Update booking
		b.BookingDate = req.NewDate
		b.StartTime = req.NewStartTime
		b.EndTime = req.NewEndTime
		b.Duration = int(req.NewEndTime.Sub(req.NewStartTime).Minutes())

		// Save booking changes
		if tx != nil {
			if err := tx.Save(b).Error; err != nil {
				return fmt.Errorf("update booking: %w", err)
			}
		}

		result = b
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetBooking retrieves a booking by ID.
func (uc *UseCase) GetBooking(ctx context.Context, id uint64) (*booking.Booking, error) {
	return uc.bookingRepo.GetByID(ctx, uc.db, id)
}

// ListBookingsByCustomer returns paginated bookings for a customer.
func (uc *UseCase) ListBookingsByCustomer(ctx context.Context, customerID uint64, status string, page, perPage int) ([]booking.Booking, int64, error) {
	return uc.bookingRepo.ListByCustomer(ctx, uc.db, customerID, status, page, perPage)
}

// ListBookingsByProvider returns paginated bookings for a provider.
func (uc *UseCase) ListBookingsByProvider(ctx context.Context, providerID uint64, status string, page, perPage int) ([]booking.Booking, int64, error) {
	return uc.bookingRepo.ListByProvider(ctx, uc.db, providerID, status, page, perPage)
}

// isValidTransition enforces the booking state machine.
func isValidTransition(current, next booking.BookingStatus, userType string) bool {
	// Allowed transitions map: current -> []next
	transitions := map[booking.BookingStatus][]booking.BookingStatus{
		booking.BookingStatusPending:   {booking.BookingStatusConfirmed, booking.BookingStatusCancelled, booking.BookingStatusRejected},
		booking.BookingStatusConfirmed: {booking.BookingStatusCompleted, booking.BookingStatusCancelled},
		booking.BookingStatusCurrent:   {booking.BookingStatusConfirmed, booking.BookingStatusCancelled},
		booking.BookingStatusCompleted: {},
		booking.BookingStatusCancelled: {},
		booking.BookingStatusRejected:  {},
	}

	allowed, ok := transitions[current]
	if !ok {
		return false
	}

	for _, s := range allowed {
		if s == next {
			return true
		}
	}
	return false
}

func generateBookingNumber() string {
	return fmt.Sprintf("BK-%d-%s", time.Now().Unix(), randomString(4))
}

func randomString(n int) string {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	result := make([]byte, n)
	for i := range result {
		result[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(result)
}
