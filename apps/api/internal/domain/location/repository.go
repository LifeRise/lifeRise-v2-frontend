package location

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for locations.
type Repository interface {
	ListByType(ctx context.Context, db *gorm.DB, t LocationType) ([]Location, error)
	ListAdmin(ctx context.Context, db *gorm.DB, locationType string, parentID *uint64, search string, page, perPage int) ([]Location, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Location, error)
	Create(ctx context.Context, db *gorm.DB, loc *Location) error
	Update(ctx context.Context, db *gorm.DB, loc *Location) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
