package favorite

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for Favorite aggregates.
type Repository interface {
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Favorite, error)
	ListByCustomer(ctx context.Context, db *gorm.DB, customerID uint64, favoriteType FavoriteType, page, perPage int) ([]Favorite, int64, error)
	Toggle(ctx context.Context, db *gorm.DB, customerID uint64, serviceID, providerID *uint64) (bool, error)
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
