package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/announcement"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// AnnouncementRepo implements announcement persistence with GORM.
type AnnouncementRepo struct{}

// NewAnnouncementRepo creates a new AnnouncementRepo.
func NewAnnouncementRepo() *AnnouncementRepo { return &AnnouncementRepo{} }

// List retrieves announcements for a company.
func (r *AnnouncementRepo) List(ctx context.Context, db *gorm.DB, companyID *uint64) ([]announcement.Announcement, error) {
	var items []announcement.Announcement
	query := db.WithContext(ctx).Where("deleted_at IS NULL")
	if companyID != nil {
		query = query.Where("company_id = ?", *companyID)
	}
	if err := query.Order("published_at DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

// ListAdmin retrieves announcements with filters and pagination.
func (r *AnnouncementRepo) ListAdmin(ctx context.Context, db *gorm.DB, companyID *uint64, audience string, priority string, search string, page, perPage int) ([]announcement.Announcement, int64, error) {
	var items []announcement.Announcement
	var total int64

	query := db.WithContext(ctx).Model(&announcement.Announcement{}).Where("deleted_at IS NULL")
	if companyID != nil {
		query = query.Where("company_id = ?", *companyID)
	}
	if audience != "" {
		query = query.Where("audience = ?", audience)
	}
	if priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if search != "" {
		query = query.Where("title ILIKE ? OR body ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("published_at DESC").Limit(perPage).Offset(offset).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

// GetByID retrieves an announcement by ID.
func (r *AnnouncementRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*announcement.Announcement, error) {
	var a announcement.Announcement
	if err := db.WithContext(ctx).First(&a, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &a, nil
}

// Create persists a new announcement.
func (r *AnnouncementRepo) Create(ctx context.Context, db *gorm.DB, a *announcement.Announcement) error {
	return db.WithContext(ctx).Create(a).Error
}

// Update persists changes to an announcement.
func (r *AnnouncementRepo) Update(ctx context.Context, db *gorm.DB, a *announcement.Announcement) error {
	return db.WithContext(ctx).Save(a).Error
}

// Delete soft-deletes an announcement.
func (r *AnnouncementRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&announcement.Announcement{}, id).Error
}
