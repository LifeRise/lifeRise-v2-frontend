package announcement

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for announcements.
type Repository interface {
	List(ctx context.Context, db *gorm.DB, companyID *uint64) ([]Announcement, error)
	Create(ctx context.Context, db *gorm.DB, a *Announcement) error
}
