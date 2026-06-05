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
}
