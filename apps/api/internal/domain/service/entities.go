package service

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ServiceCategory groups services by category.
type ServiceCategory struct {
	ID          uint64         `gorm:"column:id;primaryKey" json:"id"`
	Name        string         `gorm:"column:name;size:255;not null" json:"name"`
	Slug        string         `gorm:"column:slug;size:255;uniqueIndex;not null" json:"slug"`
	Description *string        `gorm:"column:description;type:text" json:"description,omitempty"`
	Icon        *string        `gorm:"column:icon;size:500" json:"icon,omitempty"`
	SortOrder   int            `gorm:"column:sort_order;default:0" json:"sort_order"`
	IsActive    bool           `gorm:"column:is_active;default:true" json:"is_active"`
	ParentID    *uint64        `gorm:"column:parent_id" json:"parent_id,omitempty"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (ServiceCategory) TableName() string { return "service_categories" }

// Service represents a bookable service offered by a provider or company.
type Service struct {
	ID               uint64          `gorm:"column:id;primaryKey" json:"id"`
	CompanyID        *uint64         `gorm:"column:company_id;index" json:"company_id,omitempty"`
	ProviderID       uint64          `gorm:"column:provider_id;not null;index" json:"provider_id"`
	CategoryID       *uint64         `gorm:"column:category_id;index" json:"category_id,omitempty"`
	Name             string          `gorm:"column:name;size:255;not null" json:"name"`
	Slug             string          `gorm:"column:slug;size:255;uniqueIndex;not null" json:"slug"`
	Description      *string         `gorm:"column:description;type:text" json:"description,omitempty"`
	ShortDescription *string         `gorm:"column:short_description;size:500" json:"short_description,omitempty"`
	Price            decimal.Decimal `gorm:"column:price;type:decimal(10,2)" json:"price"`
	Currency         string          `gorm:"column:currency;size:3;default:'USD'" json:"currency"`
	Duration         int             `gorm:"column:duration;not null" json:"duration"`        // minutes
	BufferTime       int             `gorm:"column:buffer_time;default:0" json:"buffer_time"` // minutes between bookings
	MaxParticipants  int             `gorm:"column:max_participants;default:1" json:"max_participants"`
	Images           datatypes.JSON  `gorm:"column:images;type:jsonb" json:"images,omitempty"`
	LocationType     string          `gorm:"column:location_type;size:50;default:'provider'" json:"location_type"` // "provider", "customer", "virtual"
	Status           string          `gorm:"column:status;size:50;default:'active'" json:"status"`
	SortOrder        int             `gorm:"column:sort_order;default:0" json:"sort_order"`
	IsFeatured       bool            `gorm:"column:is_featured;default:false" json:"is_featured"`
	AvgRating        *float64        `gorm:"column:avg_rating" json:"avg_rating,omitempty"`
	TotalReviews     int             `gorm:"column:total_reviews;default:0" json:"total_reviews"`
	Settings         datatypes.JSON  `gorm:"column:settings;type:jsonb" json:"settings,omitempty"`
	CreatedAt        time.Time       `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt        time.Time       `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt        gorm.DeletedAt  `gorm:"column:deleted_at;index" json:"-"`

	Category *ServiceCategory `gorm:"foreignKey:category_id" json:"category,omitempty"`
}

func (Service) TableName() string { return "services" }
