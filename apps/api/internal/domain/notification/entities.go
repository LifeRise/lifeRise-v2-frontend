package notification

import (
	"time"

	"gorm.io/gorm"
)

// Notification represents an in-app notification persisted for a user.
type Notification struct {
	ID        uint64         `gorm:"column:id;primaryKey"`
	UserID    uint64         `gorm:"column:user_id;not null;index"`
	Title     string         `gorm:"column:title;size:255;not null"`
	Body      string         `gorm:"column:body;type:text"`
	Type      string         `gorm:"column:type;size:50;not null;index"`
	ReadAt    *time.Time     `gorm:"column:read_at;index"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

// TableName returns the table name for GORM.
func (Notification) TableName() string { return "notifications" }
