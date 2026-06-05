package event

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Repository defines persistence for group events and related entities.
type Repository interface {
	ListUpcoming(ctx context.Context, db *gorm.DB, companyID *uint64, after time.Time, limit int) ([]GroupEvent, error)
	CountResponsesByEvent(ctx context.Context, db *gorm.DB, eventID uint64) (int64, error)
	EventBookingStatusBreakdown(ctx context.Context, db *gorm.DB, companyID *uint64) (map[string]int64, error)

	// Group Events
	ListAdmin(ctx context.Context, db *gorm.DB, companyID *uint64, status string, search string, page, perPage int) ([]GroupEvent, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*GroupEvent, error)
	Create(ctx context.Context, db *gorm.DB, e *GroupEvent) error
	Update(ctx context.Context, db *gorm.DB, e *GroupEvent) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error

	// Event Bookings
	ListEventBookings(ctx context.Context, db *gorm.DB, eventID *uint64, status string, page, perPage int) ([]EventBooking, int64, error)
	GetEventBookingByID(ctx context.Context, db *gorm.DB, id uint64) (*EventBooking, error)
	CreateEventBooking(ctx context.Context, db *gorm.DB, b *EventBooking) error
	UpdateEventBooking(ctx context.Context, db *gorm.DB, b *EventBooking) error
	DeleteEventBooking(ctx context.Context, db *gorm.DB, id uint64) error

	// Event Responses
	ListEventResponses(ctx context.Context, db *gorm.DB, eventID *uint64, response string, page, perPage int) ([]EventResponse, int64, error)
	GetEventResponseByID(ctx context.Context, db *gorm.DB, id uint64) (*EventResponse, error)
	CreateEventResponse(ctx context.Context, db *gorm.DB, r *EventResponse) error
	UpdateEventResponse(ctx context.Context, db *gorm.DB, r *EventResponse) error
	DeleteEventResponse(ctx context.Context, db *gorm.DB, id uint64) error
}
