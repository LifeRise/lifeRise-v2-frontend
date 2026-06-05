package booking

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// BookingStatus represents the lifecycle states of a booking.
type BookingStatus string

const (
	BookingStatusCurrent   BookingStatus = "Current"
	BookingStatusPending   BookingStatus = "Pending"
	BookingStatusConfirmed BookingStatus = "Confirmed"
	BookingStatusCompleted BookingStatus = "Completed"
	BookingStatusCancelled BookingStatus = "Cancelled"
	BookingStatusRejected  BookingStatus = "Rejected"
)

func (s BookingStatus) Valid() bool {
	switch s {
	case BookingStatusCurrent, BookingStatusPending, BookingStatusConfirmed,
		BookingStatusCompleted, BookingStatusCancelled, BookingStatusRejected:
		return true
	}
	return false
}

func (s BookingStatus) String() string { return string(s) }

// Booking is the core reservation entity.
type Booking struct {
	ID                 uint64           `gorm:"column:id;primaryKey"`
	BookingNumber      string           `gorm:"column:booking_number;size:50;uniqueIndex;not null"`
	CustomerID         uint64           `gorm:"column:customer_id;not null;index"`
	ServiceProviderID  uint64           `gorm:"column:service_provider_id;not null;index"`
	ServiceID          uint64           `gorm:"column:service_id;not null;index"`
	CompanyID          *uint64          `gorm:"column:company_id;index"`
	Status             string           `gorm:"column:status;size:50;not null;index"`
	BookingDate        time.Time        `gorm:"column:booking_date;not null"`
	StartTime          time.Time        `gorm:"column:start_time;not null"`
	EndTime            time.Time        `gorm:"column:end_time;not null"`
	Duration           int              `gorm:"column:duration;not null"` // minutes
	Price              decimal.Decimal  `gorm:"column:price;type:decimal(10,2)"`
	DiscountAmount     *decimal.Decimal `gorm:"column:discount_amount;type:decimal(10,2)"`
	FinalPrice         decimal.Decimal  `gorm:"column:final_price;type:decimal(10,2)"`
	Currency           string           `gorm:"column:currency;size:3;default:'USD'"`
	Notes              *string          `gorm:"column:notes;type:text"`
	CustomerNotes      *string          `gorm:"column:customer_notes;type:text"`
	ProviderNotes      *string          `gorm:"column:provider_notes;type:text"`
	CancellationReason *string          `gorm:"column:cancellation_reason;type:text"`
	CancelledBy        *string          `gorm:"column:cancelled_by;size:50"`
	CancelledAt        *time.Time       `gorm:"column:cancelled_at"`
	CompletedAt        *time.Time       `gorm:"column:completed_at"`
	ConfirmedAt        *time.Time       `gorm:"column:confirmed_at"`
	PromoCodeID        *uint64          `gorm:"column:promo_code_id"`
	PaymentStatus      string           `gorm:"column:payment_status;size:50;default:'pending'"`
	Location           datatypes.JSON   `gorm:"column:location;type:jsonb"`
	Metadata           datatypes.JSON   `gorm:"column:metadata;type:jsonb"`
	CreatedAt          time.Time        `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt          time.Time        `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt          gorm.DeletedAt   `gorm:"column:deleted_at;index"`
}

func (Booking) TableName() string { return "bookings" }

// AvailableSlot represents a bookable time slot for a service provider.
type AvailableSlot struct {
	ID                uint64         `gorm:"column:id;primaryKey"`
	ServiceProviderID uint64         `gorm:"column:service_provider_id;not null;index"`
	ServiceID         *uint64        `gorm:"column:service_id;index"`
	CompanyID         *uint64        `gorm:"column:company_id;index"`
	Date              time.Time      `gorm:"column:date;not null;index"`
	StartTime         time.Time      `gorm:"column:start_time;not null"`
	EndTime           time.Time      `gorm:"column:end_time;not null"`
	IsAvailable       bool           `gorm:"column:is_available;default:true;index"`
	IsRecurring       bool           `gorm:"column:is_recurring;default:false"`
	RecurringRuleID   *uint64        `gorm:"column:recurring_rule_id"`
	BookedByBookingID *uint64        `gorm:"column:booked_by_booking_id"`
	CreatedAt         time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt         time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt         gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (AvailableSlot) TableName() string { return "available_slots" }

// BookingAvailableSlot is the pivot table linking bookings to their reserved slots.
type BookingAvailableSlot struct {
	ID              uint64    `gorm:"column:id;primaryKey"`
	BookingID       uint64    `gorm:"column:booking_id;not null;index"`
	AvailableSlotID uint64    `gorm:"column:available_slot_id;not null;index"`
	CreatedAt       time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (BookingAvailableSlot) TableName() string { return "booking_available_slots" }

// BookingRescheduleRecord tracks changes to booking dates/times.
type BookingRescheduleRecord struct {
	ID            uint64    `gorm:"column:id;primaryKey"`
	BookingID     uint64    `gorm:"column:booking_id;not null;index"`
	OldDate       time.Time `gorm:"column:old_date;not null"`
	NewDate       time.Time `gorm:"column:new_date;not null"`
	OldStartTime  time.Time `gorm:"column:old_start_time;not null"`
	NewStartTime  time.Time `gorm:"column:new_start_time;not null"`
	OldEndTime    time.Time `gorm:"column:old_end_time;not null"`
	NewEndTime    time.Time `gorm:"column:new_end_time;not null"`
	RescheduledBy uint64    `gorm:"column:rescheduled_by;not null"`
	Reason        *string   `gorm:"column:reason;type:text"`
	CreatedAt     time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (BookingRescheduleRecord) TableName() string { return "booking_reschedule_records" }

// WaitlistEntry tracks customers waiting for slots to open.
type WaitlistEntry struct {
	ID          uint64     `gorm:"column:id;primaryKey"`
	CustomerID  uint64     `gorm:"column:customer_id;not null;index"`
	ServiceID   uint64     `gorm:"column:service_id;not null;index"`
	ProviderID  uint64     `gorm:"column:provider_id;not null;index"`
	DesiredDate time.Time  `gorm:"column:desired_date;not null"`
	Status      string     `gorm:"column:status;size:50;default:'waiting'"` // "waiting", "notified", "converted", "expired"
	NotifiedAt  *time.Time `gorm:"column:notified_at"`
	ExpiresAt   *time.Time `gorm:"column:expires_at"`
	CreatedAt   time.Time  `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;autoUpdateTime"`
}

func (WaitlistEntry) TableName() string { return "waitlist_entries" }
