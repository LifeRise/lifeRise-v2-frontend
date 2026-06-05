package booking

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Repository defines persistence for Booking aggregates.
type Repository interface {
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Booking, error)
	GetByBookingNumber(ctx context.Context, db *gorm.DB, number string) (*Booking, error)
	ListByCustomer(ctx context.Context, db *gorm.DB, customerID uint64, status string, page, perPage int) ([]Booking, int64, error)
	ListByProvider(ctx context.Context, db *gorm.DB, providerID uint64, status string, page, perPage int) ([]Booking, int64, error)
	ListAdmin(ctx context.Context, db *gorm.DB, status string, search string, page, perPage int) ([]Booking, int64, error)
	Create(ctx context.Context, db *gorm.DB, booking *Booking) error
	Update(ctx context.Context, db *gorm.DB, booking *Booking) error
	UpdateStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error
	UpdatePaymentStatus(ctx context.Context, db *gorm.DB, id uint64, status string) error
	SoftDelete(ctx context.Context, db *gorm.DB, id uint64) error
	ListRefunded(ctx context.Context, db *gorm.DB, search string, dateFrom string, dateTo string, page, perPage int) ([]Booking, int64, error)
}

// SlotRepository defines persistence for AvailableSlot aggregates.
type SlotRepository interface {
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*AvailableSlot, error)
	ListAvailable(ctx context.Context, db *gorm.DB, providerID uint64, date time.Time) ([]AvailableSlot, error)
	LockSlot(ctx context.Context, db *gorm.DB, slotID uint64, bookingID uint64) error
	UnlockSlot(ctx context.Context, db *gorm.DB, slotID uint64) error
	Create(ctx context.Context, db *gorm.DB, slot *AvailableSlot) error
}
