package announcement

import (
	"time"

	"gorm.io/gorm"
)

// Audience target for an announcement.
type Audience string

const (
	AudienceAll       Audience = "all"
	AudienceResidents Audience = "residents"
	AudienceVendors   Audience = "vendors"
)

// Valid returns true for known audiences.
func (a Audience) Valid() bool {
	switch a {
	case AudienceAll, AudienceResidents, AudienceVendors:
		return true
	}
	return false
}

// Priority level for an announcement.
type Priority string

const (
	PriorityNormal Priority = "normal"
	PriorityUrgent Priority = "urgent"
)

// Valid returns true for known priorities.
func (p Priority) Valid() bool {
	switch p {
	case PriorityNormal, PriorityUrgent:
		return true
	}
	return false
}

// Announcement represents a broadcast message to users.
type Announcement struct {
	ID           uint64         `gorm:"column:id;primaryKey"`
	CompanyID    *uint64        `gorm:"column:company_id;index"`
	AuthorUserID *uint64        `gorm:"column:author_user_id;index"`
	Title        string         `gorm:"column:title;size:255;not null"`
	Body         string         `gorm:"column:body;type:text;not null"`
	Audience     string         `gorm:"column:audience;size:20;not null"`
	Priority     string         `gorm:"column:priority;size:20;not null"`
	PublishedAt  time.Time      `gorm:"column:published_at;not null"`
	ExpiresAt    *time.Time     `gorm:"column:expires_at"`
	CreatedAt    time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt    gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (Announcement) TableName() string { return "announcements" }
