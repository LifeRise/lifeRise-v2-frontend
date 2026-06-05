package feedback

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for feedback.
type Repository interface {
	ListAdmin(ctx context.Context, db *gorm.DB, search string, page, perPage int) ([]Feedback, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Feedback, error)
	Update(ctx context.Context, db *gorm.DB, f *Feedback) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
