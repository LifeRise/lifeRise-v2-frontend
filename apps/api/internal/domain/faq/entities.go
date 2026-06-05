package faq

import (
	"time"

	"gorm.io/gorm"
)

// FAQ represents a frequently-asked question entry.
type FAQ struct {
	ID        uint64         `gorm:"column:id;primaryKey"`
	Category  string         `gorm:"column:category;size:100;not null;index"`
	Question  string         `gorm:"column:question;type:text;not null"`
	Answer    string         `gorm:"column:answer;type:text;not null"`
	SortOrder int            `gorm:"column:sort_order;default:0"`
	Active    bool           `gorm:"column:active;default:true"`
	CreatedAt time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (FAQ) TableName() string { return "faqs" }
