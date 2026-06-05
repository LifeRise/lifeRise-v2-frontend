package persistence

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/location"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// LocationRepo implements location.Repository with GORM.
type LocationRepo struct{}

// NewLocationRepo creates a new LocationRepo.
func NewLocationRepo() *LocationRepo { return &LocationRepo{} }

// ListByType retrieves locations by type.
func (r *LocationRepo) ListByType(ctx context.Context, db *gorm.DB, t location.LocationType) ([]location.Location, error) {
	var locs []location.Location
	if err := db.WithContext(ctx).Where("type = ?", t).Order("name asc").Find(&locs).Error; err != nil {
		return nil, err
	}
	return locs, nil
}

// ListAdmin retrieves locations with filters and pagination.
func (r *LocationRepo) ListAdmin(ctx context.Context, db *gorm.DB, locationType string, parentID *uint64, search string, page, perPage int) ([]location.Location, int64, error) {
	var locs []location.Location
	var total int64

	query := db.WithContext(ctx).Model(&location.Location{})
	if locationType != "" {
		query = query.Where("type = ?", locationType)
	}
	if parentID != nil {
		query = query.Where("parent_id = ?", *parentID)
	}
	if search != "" {
		searchTerm := fmt.Sprintf("%%%s%%", search)
		query = query.Where("name ILIKE ?", searchTerm)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 15
	}
	if perPage > 100 {
		perPage = 100
	}

	offset := (page - 1) * perPage
	if err := query.Order("name asc").Offset(offset).Limit(perPage).Find(&locs).Error; err != nil {
		return nil, 0, err
	}
	return locs, total, nil
}

// GetByID retrieves a location by ID.
func (r *LocationRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*location.Location, error) {
	var loc location.Location
	if err := db.WithContext(ctx).First(&loc, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &loc, nil
}

// Create persists a new location.
func (r *LocationRepo) Create(ctx context.Context, db *gorm.DB, loc *location.Location) error {
	return db.WithContext(ctx).Create(loc).Error
}

// Update persists changes to a location.
func (r *LocationRepo) Update(ctx context.Context, db *gorm.DB, loc *location.Location) error {
	return db.WithContext(ctx).Save(loc).Error
}

// Delete hard-deletes a location.
func (r *LocationRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&location.Location{}, id).Error
}
