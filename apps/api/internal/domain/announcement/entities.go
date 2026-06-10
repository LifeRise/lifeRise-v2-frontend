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
	ID           uint64         `gorm:"column:id;primaryKey" json:"id"`
	CompanyID    *uint64        `gorm:"column:company_id;index" json:"company_id,omitempty"`
	AuthorUserID *uint64        `gorm:"column:author_user_id;index" json:"author_user_id,omitempty"`
	Title        string         `gorm:"column:title;size:255;not null" json:"title"`
	Body         string         `gorm:"column:body;type:text;not null" json:"body"`
	Audience     string         `gorm:"column:audience;size:20;not null" json:"audience"`
	Priority     string         `gorm:"column:priority;size:20;not null" json:"priority"`
	PublishedAt  time.Time      `gorm:"column:published_at;not null" json:"published_at"`
	ExpiresAt    *time.Time     `gorm:"column:expires_at" json:"expires_at,omitempty"`
	CreatedAt    time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Announcement) TableName() string { return "announcements" }
