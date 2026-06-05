package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/banner"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// BannerRepo implements banner persistence with GORM.
type BannerRepo struct{}

// NewBannerRepo creates a new BannerRepo.
func NewBannerRepo() *BannerRepo { return &BannerRepo{} }

// ListActive retrieves active banners for an audience.
func (r *BannerRepo) ListActive(ctx context.Context, db *gorm.DB, audience string) ([]banner.AppBanner, error) {
	var items []banner.AppBanner
	query := db.WithContext(ctx).Where("active = ?", true)
	if audience != "" {
		query = query.Where("audience = ?", audience)
	}
	if err := query.Order("sort_order ASC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

// ListAdmin retrieves banners with filters and pagination.
func (r *BannerRepo) ListAdmin(ctx context.Context, db *gorm.DB, audience string, active *bool, search string, page, perPage int) ([]banner.AppBanner, int64, error) {
	var items []banner.AppBanner
	var total int64

	query := db.WithContext(ctx).Model(&banner.AppBanner{})
	if audience != "" {
		query = query.Where("audience = ?", audience)
	}
	if active != nil {
		query = query.Where("active = ?", *active)
	}
	if search != "" {
		query = query.Where("title ILIKE ?", "%"+search+"%")
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

// GetByID retrieves a banner by ID.
func (r *BannerRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*banner.AppBanner, error) {
	var b banner.AppBanner
	if err := db.WithContext(ctx).First(&b, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

// Create persists a new banner.
func (r *BannerRepo) Create(ctx context.Context, db *gorm.DB, b *banner.AppBanner) error {
	return db.WithContext(ctx).Create(b).Error
}

// Update persists changes to a banner.
func (r *BannerRepo) Update(ctx context.Context, db *gorm.DB, b *banner.AppBanner) error {
	return db.WithContext(ctx).Save(b).Error
}

// Delete hard-deletes a banner.
func (r *BannerRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Unscoped().Delete(&banner.AppBanner{}, id).Error
}
