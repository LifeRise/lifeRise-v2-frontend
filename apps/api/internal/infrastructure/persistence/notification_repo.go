package persistence

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/notification"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// NotificationRepo implements notification.Repository with GORM.
type NotificationRepo struct{}

// NewNotificationRepo creates a new NotificationRepo.
func NewNotificationRepo() *NotificationRepo { return &NotificationRepo{} }

// Create persists a new notification.
func (r *NotificationRepo) Create(ctx context.Context, db *gorm.DB, n *notification.Notification) error {
	return db.WithContext(ctx).Create(n).Error
}

// GetByID retrieves a notification by its ID.
func (r *NotificationRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*notification.Notification, error) {
	var n notification.Notification
	if err := db.WithContext(ctx).First(&n, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &n, nil
}

// ListByUserID returns paginated notifications for a user, optionally filtering to unread only.
func (r *NotificationRepo) ListByUserID(ctx context.Context, db *gorm.DB, userID uint64, unreadOnly bool, page, perPage int) ([]notification.Notification, int64, error) {
	query := db.WithContext(ctx).Model(&notification.Notification{}).Where("user_id = ?", userID)
	if unreadOnly {
		query = query.Where("read_at IS NULL")
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

	var results []notification.Notification
	offset := (page - 1) * perPage
	if err := query.Order("created_at DESC").Offset(offset).Limit(perPage).Find(&results).Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

// MarkRead updates the read_at timestamp for a notification belonging to a specific user.
func (r *NotificationRepo) MarkRead(ctx context.Context, db *gorm.DB, userID, id uint64) error {
	now := time.Now()
	result := db.WithContext(ctx).Model(&notification.Notification{}).Where("id = ? AND user_id = ?", id, userID).Update("read_at", now)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return apperrors.ErrNotFound
	}
	return nil
}

// MarkAllRead marks all unread notifications for a user as read.
func (r *NotificationRepo) MarkAllRead(ctx context.Context, db *gorm.DB, userID uint64) error {
	now := time.Now()
	return db.WithContext(ctx).Model(&notification.Notification{}).Where("user_id = ? AND read_at IS NULL", userID).Update("read_at", now).Error
}

// Delete soft-deletes a notification.
func (r *NotificationRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&notification.Notification{}, id).Error
}
