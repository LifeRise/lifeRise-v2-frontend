package persistence

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/favorite"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// FavoriteRepo implements favorite.Repository with GORM.
type FavoriteRepo struct{}

// NewFavoriteRepo creates a new FavoriteRepo.
func NewFavoriteRepo() *FavoriteRepo { return &FavoriteRepo{} }

func (r *FavoriteRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*favorite.Favorite, error) {
	var f favorite.Favorite
	if err := db.WithContext(ctx).First(&f, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &f, nil
}

func (r *FavoriteRepo) ListByCustomer(ctx context.Context, db *gorm.DB, customerID uint64, favoriteType favorite.FavoriteType, page, perPage int) ([]favorite.Favorite, int64, error) {
	query := db.WithContext(ctx).Model(&favorite.Favorite{}).Where("customerId = ?", customerID)

	if favoriteType == favorite.FavoriteTypeService {
		query = query.Where("serviceId IS NOT NULL")
	} else if favoriteType == favorite.FavoriteTypeProvider {
		query = query.Where("providerId IS NOT NULL")
	}

	var total int64
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

	var results []favorite.Favorite
	offset := (page - 1) * perPage
	if err := query.Order("created_at desc").Offset(offset).Limit(perPage).Find(&results).Error; err != nil {
		return nil, 0, err
	}

	return results, total, nil
}

func (r *FavoriteRepo) Toggle(ctx context.Context, db *gorm.DB, customerID uint64, serviceID, providerID *uint64) (bool, error) {
	var existing favorite.Favorite
	query := db.WithContext(ctx).Where("customerId = ?", customerID)
	if serviceID != nil {
		query = query.Where("serviceId = ?", *serviceID)
	} else {
		query = query.Where("serviceId IS NULL")
	}
	if providerID != nil {
		query = query.Where("providerId = ?", *providerID)
	} else {
		query = query.Where("providerId IS NULL")
	}

	err := query.First(&existing).Error
	if err == nil {
		// Exists → delete (toggle off)
		if err := db.WithContext(ctx).Delete(&existing).Error; err != nil {
			return false, fmt.Errorf("delete favorite: %w", err)
		}
		return false, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return false, err
	}

	// Not exists → create (toggle on)
	f := &favorite.Favorite{
		CustomerID: customerID,
		ServiceID:  serviceID,
		ProviderID: providerID,
	}
	if err := db.WithContext(ctx).Create(f).Error; err != nil {
		return false, fmt.Errorf("create favorite: %w", err)
	}
	return true, nil
}

func (r *FavoriteRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&favorite.Favorite{}, id).Error
}
