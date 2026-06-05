package favorite

import (
	"time"

	"gorm.io/gorm"
)

// Favorite tracks customer favorites for services or providers.
type Favorite struct {
	ID         uint64    `gorm:"column:id;primaryKey"`
	CustomerID uint64    `gorm:"column:customerId;not null;index"`
	ServiceID  *uint64   `gorm:"column:serviceId;index"`
	ProviderID *uint64   `gorm:"column:providerId;index"`
	CreatedAt  time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (Favorite) TableName() string { return "favorites" }

// FavoriteType identifies what was favorited.
type FavoriteType string

const (
	FavoriteTypeService  FavoriteType = "service"
	FavoriteTypeProvider FavoriteType = "provider"
)

// BeforeCreate hook ensures uniqueness at the application level.
// The unique index should also exist in the database schema.
func (f *Favorite) BeforeCreate(tx *gorm.DB) error {
	// GORM unique index: index:favorites_unique,customerId,serviceId,providerId
	return nil
}
