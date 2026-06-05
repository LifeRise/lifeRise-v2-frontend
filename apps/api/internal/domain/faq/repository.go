package faq

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for FAQs.
type Repository interface {
	List(ctx context.Context, db *gorm.DB, category string) ([]FAQ, error)
}
