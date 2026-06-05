package feedback

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/datatypes"
)

// Feedback represents a customer review of a service provider.
// Table columns use camelCase to match the existing Laravel schema.
type Feedback struct {
	ID                uint64           `gorm:"column:id;primaryKey"`
	ServiceProviderID uint64           `gorm:"column:serviceProviderId;not null;index"`
	BookingID         *uint64          `gorm:"column:bookingId;index"`
	CustomerID        uint64           `gorm:"column:customerId;not null;index"`
	ServiceID         *uint64          `gorm:"column:serviceId;index"`
	ServiceDate       *time.Time       `gorm:"column:serviceDate"`
	Rating            *decimal.Decimal `gorm:"column:rating;type:decimal(3,2)"`
	Review            *string          `gorm:"column:review;type:text"`
	Images            datatypes.JSON   `gorm:"column:images;type:jsonb"`
	FlaggedAt         *time.Time       `gorm:"column:flagged_at"`
	CreatedAt         time.Time        `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt         time.Time        `gorm:"column:updated_at;autoUpdateTime"`
}

func (Feedback) TableName() string { return "feedbacks" }
