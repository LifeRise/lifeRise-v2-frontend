package waitlist

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for waitlist entries.
type Repository interface {
	List(ctx context.Context, db *gorm.DB) ([]WaitlistEntry, error)
}
