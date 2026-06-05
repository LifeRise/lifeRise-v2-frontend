package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/waitlist"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// WaitlistRepo implements waitlist.Repository with GORM.
type WaitlistRepo struct{}

// NewWaitlistRepo creates a new WaitlistRepo.
func NewWaitlistRepo() *WaitlistRepo { return &WaitlistRepo{} }

// GetByID retrieves a waitlist entry by ID.
func (r *WaitlistRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*waitlist.WaitlistEntry, error) {
	var w waitlist.WaitlistEntry
	if err := db.WithContext(ctx).First(&w, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &w, nil
}

// List retrieves all waitlist entries.
func (r *WaitlistRepo) List(ctx context.Context, db *gorm.DB) ([]waitlist.WaitlistEntry, error) {
	var entries []waitlist.WaitlistEntry
	if err := db.WithContext(ctx).Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

// ListAdmin retrieves waitlist entries with filters and pagination.
func (r *WaitlistRepo) ListAdmin(ctx context.Context, db *gorm.DB, status string, search string, page, perPage int) ([]waitlist.WaitlistEntry, int64, error) {
	query := db.WithContext(ctx).Model(&waitlist.WaitlistEntry{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	// WaitlistEntry has no name field; search is reserved for future expansion.
	_ = search

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	var results []waitlist.WaitlistEntry
	if err := query.Order("created_at DESC").Limit(perPage).Offset(offset).Find(&results).Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

// Create persists a new waitlist entry.
func (r *WaitlistRepo) Create(ctx context.Context, db *gorm.DB, w *waitlist.WaitlistEntry) error {
	return db.WithContext(ctx).Create(w).Error
}

// Update persists changes to a waitlist entry.
func (r *WaitlistRepo) Update(ctx context.Context, db *gorm.DB, w *waitlist.WaitlistEntry) error {
	return db.WithContext(ctx).Save(w).Error
}

// Delete hard-deletes a waitlist entry.
func (r *WaitlistRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&waitlist.WaitlistEntry{}, id).Error
}
