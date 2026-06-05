package location

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for locations.
type Repository interface {
	ListByType(ctx context.Context, db *gorm.DB, t LocationType) ([]Location, error)
}
