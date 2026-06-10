package announcement

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for announcements.
type Repository interface {
	List(ctx context.Context, db *gorm.DB, companyID *uint64) ([]Announcement, error)
	ListAdmin(ctx context.Context, db *gorm.DB, companyID *uint64, audience string, priority string, search string, page, perPage int) ([]Announcement, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Announcement, error)
	Create(ctx context.Context, db *gorm.DB, a *Announcement) error
	Update(ctx context.Context, db *gorm.DB, a *Announcement) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
