package faq

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for FAQs.
type Repository interface {
	List(ctx context.Context, db *gorm.DB, category string) ([]FAQ, error)
	ListAdmin(ctx context.Context, db *gorm.DB, category string, search string, page, perPage int) ([]FAQ, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*FAQ, error)
	Create(ctx context.Context, db *gorm.DB, f *FAQ) error
	Update(ctx context.Context, db *gorm.DB, f *FAQ) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
