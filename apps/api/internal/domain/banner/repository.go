package banner

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for app banners.
type Repository interface {
	ListActive(ctx context.Context, db *gorm.DB, audience string) ([]AppBanner, error)
}
