package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/faq"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// FAQRepo implements FAQ persistence with GORM.
type FAQRepo struct{}

// NewFAQRepo creates a new FAQRepo.
func NewFAQRepo() *FAQRepo { return &FAQRepo{} }

// List retrieves FAQs for a category.
func (r *FAQRepo) List(ctx context.Context, db *gorm.DB, category string) ([]faq.FAQ, error) {
	var items []faq.FAQ
	query := db.WithContext(ctx).Where("deleted_at IS NULL")
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if err := query.Order("sort_order ASC, created_at DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

// ListAdmin retrieves FAQs with filters and pagination.
func (r *FAQRepo) ListAdmin(ctx context.Context, db *gorm.DB, category string, search string, page, perPage int) ([]faq.FAQ, int64, error) {
	var items []faq.FAQ
	var total int64

	query := db.WithContext(ctx).Model(&faq.FAQ{}).Where("deleted_at IS NULL")
	if category != "" {
		query = query.Where("category = ?", category)
	}
	if search != "" {
		query = query.Where("question ILIKE ? OR answer ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("sort_order ASC, created_at DESC").Limit(perPage).Offset(offset).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// GetByID retrieves an FAQ by ID.
func (r *FAQRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*faq.FAQ, error) {
	var f faq.FAQ
	if err := db.WithContext(ctx).First(&f, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &f, nil
}

// Create persists a new FAQ.
func (r *FAQRepo) Create(ctx context.Context, db *gorm.DB, f *faq.FAQ) error {
	return db.WithContext(ctx).Create(f).Error
}

// Update persists changes to an FAQ.
func (r *FAQRepo) Update(ctx context.Context, db *gorm.DB, f *faq.FAQ) error {
	return db.WithContext(ctx).Save(f).Error
}

// Delete soft-deletes an FAQ.
func (r *FAQRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&faq.FAQ{}, id).Error
}
