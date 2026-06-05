package banner

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for app banners.
type Repository interface {
	ListActive(ctx context.Context, db *gorm.DB, audience string) ([]AppBanner, error)
	ListAdmin(ctx context.Context, db *gorm.DB, audience string, active *bool, search string, page, perPage int) ([]AppBanner, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*AppBanner, error)
	Create(ctx context.Context, db *gorm.DB, b *AppBanner) error
	Update(ctx context.Context, db *gorm.DB, b *AppBanner) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
