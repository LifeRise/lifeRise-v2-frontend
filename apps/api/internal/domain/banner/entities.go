package banner

import (
	"time"
)

// AppBanner represents a promotional banner in the mobile/web app.
type AppBanner struct {
	ID        uint64     `gorm:"column:id;primaryKey"`
	Title     string     `gorm:"column:title;size:255;not null"`
	ImageURL  string     `gorm:"column:image_url;size:500;not null"`
	TargetURL *string    `gorm:"column:target_url;size:500"`
	Audience  string     `gorm:"column:audience;size:20;not null"`
	SortOrder int        `gorm:"column:sort_order;default:0"`
	Active    bool       `gorm:"column:active;default:true"`
	StartsAt  time.Time  `gorm:"column:starts_at;not null"`
	EndsAt    *time.Time `gorm:"column:ends_at"`
	CreatedAt time.Time  `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time  `gorm:"column:updated_at;autoUpdateTime"`
}

func (AppBanner) TableName() string { return "app_banners" }
