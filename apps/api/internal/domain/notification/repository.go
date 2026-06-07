package notification

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence operations for notifications.
type Repository interface {
	Create(ctx context.Context, db *gorm.DB, n *Notification) error
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Notification, error)
	ListByUserID(ctx context.Context, db *gorm.DB, userID uint64, unreadOnly bool, page, perPage int) ([]Notification, int64, error)
	MarkRead(ctx context.Context, db *gorm.DB, userID, id uint64) error
	MarkAllRead(ctx context.Context, db *gorm.DB, userID uint64) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
}
