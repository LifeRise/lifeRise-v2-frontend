package persistence

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/feedback"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// FeedbackRepo implements feedback.Repository with GORM.
type FeedbackRepo struct{}

// NewFeedbackRepo creates a new FeedbackRepo.
func NewFeedbackRepo() *FeedbackRepo { return &FeedbackRepo{} }

func (r *FeedbackRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*feedback.Feedback, error) {
	var f feedback.Feedback
	if err := db.WithContext(ctx).First(&f, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &f, nil
}

func (r *FeedbackRepo) ListAdmin(ctx context.Context, db *gorm.DB, search string, page, perPage int) ([]feedback.Feedback, int64, error) {
	query := db.WithContext(ctx).Model(&feedback.Feedback{})
	if search != "" {
		searchPattern := fmt.Sprintf("%%%s%%", search)
		query = query.Where("review ILIKE ?", searchPattern)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 25
	}
	if perPage > 100 {
		perPage = 100
	}

	var results []feedback.Feedback
	offset := (page - 1) * perPage
	if err := query.Order("created_at desc").Offset(offset).Limit(perPage).Find(&results).Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

func (r *FeedbackRepo) Update(ctx context.Context, db *gorm.DB, f *feedback.Feedback) error {
	return db.WithContext(ctx).Save(f).Error
}

func (r *FeedbackRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&feedback.Feedback{}, id).Error
}
