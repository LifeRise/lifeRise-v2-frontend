package favorite

import (
	"context"
	"fmt"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/favorite"
)

// UseCase handles favorite operations.
type UseCase struct {
	db   *gorm.DB
	repo favorite.Repository
}

// NewUseCase creates a new favorite UseCase.
func NewUseCase(db *gorm.DB, repo favorite.Repository) *UseCase {
	return &UseCase{db: db, repo: repo}
}

// ToggleFavorite adds or removes a favorite atomically.
// Returns true if the item is now favorited, false if unfavorited.
func (uc *UseCase) ToggleFavorite(ctx context.Context, customerID uint64, serviceID, providerID *uint64) (bool, error) {
	if serviceID == nil && providerID == nil {
		return false, fmt.Errorf("either service_id or provider_id is required")
	}
	return uc.repo.Toggle(ctx, uc.db, customerID, serviceID, providerID)
}

// ListFavorites returns paginated favorites for a customer.
func (uc *UseCase) ListFavorites(ctx context.Context, customerID uint64, favType favorite.FavoriteType, page, perPage int) ([]favorite.Favorite, int64, error) {
	return uc.repo.ListByCustomer(ctx, uc.db, customerID, favType, page, perPage)
}

// RemoveFavorite deletes a favorite by its ID.
func (uc *UseCase) RemoveFavorite(ctx context.Context, customerID, favoriteID uint64) error {
	f, err := uc.repo.GetByID(ctx, uc.db, favoriteID)
	if err != nil {
		return err
	}
	if f.CustomerID != customerID {
		return fmt.Errorf("unauthorized")
	}
	return uc.repo.Delete(ctx, uc.db, favoriteID)
}
