package persistence

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/booking"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// BookingRepo implements booking.Repository with GORM.
type BookingRepo struct{}

// NewBookingRepo creates a new BookingRepo.
func NewBookingRepo() *BookingRepo { return &BookingRepo{} }

func (r *BookingRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*booking.Booking, error) {
	var b booking.Booking
	if err := db.WithContext(ctx).First(&b, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

func (r *BookingRepo) GetByBookingNumber(ctx context.Context, db *gorm.DB, number string) (*booking.Booking, error) {
	var b booking.Booking
	if err := db.WithContext(ctx).Where("booking_number = ?", number).First(&b).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

func (r *BookingRepo) ListByCustomer(ctx context.Context, db *gorm.DB, customerID uint64, status string, page, perPage int) ([]booking.Booking, int64, error) {
	query := db.WithContext(ctx).Model(&booking.Booking{}).Where("customer_id = ?", customerID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 15
	}
	if perPage > 100 {
		perPage = 100
	}

	var results []booking.Booking
	offset := (page - 1) * perPage
	if err := query.Order("booking_date desc, start_time desc").Offset(offset).Limit(perPage).Find(&results).Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

func (r *BookingRepo) ListByProvider(ctx context.Context, db *gorm.DB, providerID uint64, status string, page, perPage int) ([]booking.Booking, int64, error) {
	query := db.WithContext(ctx).Model(&booking.Booking{}).Where("service_provider_id = ?", providerID)
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 15
	}
	if perPage > 100 {
		perPage = 100
	}

	var results []booking.Booking
	offset := (page - 1) * perPage
	if err := query.Order("booking_date desc, start_time desc").Offset(offset).Limit(perPage).Find(&results).Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

func (r *BookingRepo) Create(ctx context.Context, db *gorm.DB, b *booking.Booking) error {
	return db.WithContext(ctx).Create(b).Error
}

func (r *BookingRepo) UpdateStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error {
	return db.WithContext(ctx).Model(&booking.Booking{}).Where("id = ?", id).Update("status", status).Error
}

func (r *BookingRepo) UpdatePaymentStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error {
	return db.WithContext(ctx).Model(&booking.Booking{}).Where("id = ?", id).Update("payment_status", status).Error
}

func (r *BookingRepo) SoftDelete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&booking.Booking{}, id).Error
}

// SlotRepo implements booking.SlotRepository with GORM.
type SlotRepo struct{}

// NewSlotRepo creates a new SlotRepo.
func NewSlotRepo() *SlotRepo { return &SlotRepo{} }

func (r *SlotRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*booking.AvailableSlot, error) {
	var s booking.AvailableSlot
	if err := db.WithContext(ctx).First(&s, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (r *SlotRepo) ListAvailable(ctx context.Context, db *gorm.DB, providerID uint64, date time.Time) ([]booking.AvailableSlot, error) {
	var slots []booking.AvailableSlot
	if err := db.WithContext(ctx).
		Where("service_provider_id = ?", providerID).
		Where("date = ?", date.Format("2006-01-02")).
		Where("is_available = ?", true).
		Where("booked_by_booking_id IS NULL").
		Order("start_time asc").
		Find(&slots).Error; err != nil {
		return nil, err
	}
	return slots, nil
}

func (r *SlotRepo) LockSlot(ctx context.Context, db *gorm.DB, slotID uint64, bookingID uint64) error {
	return db.WithContext(ctx).Model(&booking.AvailableSlot{}).
		Where("id = ? AND is_available = ? AND booked_by_booking_id IS NULL", slotID, true).
		Updates(map[string]interface{}{
			"is_available":         false,
			"booked_by_booking_id": bookingID,
		}).Error
}

func (r *SlotRepo) UnlockSlot(ctx context.Context, db *gorm.DB, slotID uint64) error {
	return db.WithContext(ctx).Model(&booking.AvailableSlot{}).
		Where("id = ?", slotID).
		Updates(map[string]interface{}{
			"is_available":         true,
			"booked_by_booking_id": nil,
		}).Error
}

func (r *SlotRepo) Create(ctx context.Context, db *gorm.DB, slot *booking.AvailableSlot) error {
	return db.WithContext(ctx).Create(slot).Error
}
