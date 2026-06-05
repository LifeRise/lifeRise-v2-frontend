package waitlist

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for waitlist entries.
type Repository interface {
	List(ctx context.Context, db *gorm.DB) ([]WaitlistEntry, error)
	ListAdmin(ctx context.Context, db *gorm.DB, status string, search string, page, perPage int) ([]WaitlistEntry, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*WaitlistEntry, error)
	Create(ctx context.Context, db *gorm.DB, w *WaitlistEntry) error
	Update(ctx context.Context, db *gorm.DB, w *WaitlistEntry) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
