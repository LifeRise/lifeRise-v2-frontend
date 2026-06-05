package customer

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines the persistence contract for Customer aggregates.
type Repository interface {
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Customer, error)
	GetByEmail(ctx context.Context, db *gorm.DB, email string) (*Customer, error)
	GetByPhone(ctx context.Context, db *gorm.DB, phone string) (*Customer, error)
	Create(ctx context.Context, db *gorm.DB, customer *Customer) error
	Update(ctx context.Context, db *gorm.DB, customer *Customer) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
	ListAdmin(ctx context.Context, db *gorm.DB, status string, search string, page, perPage int) ([]Customer, int64, error)
}
