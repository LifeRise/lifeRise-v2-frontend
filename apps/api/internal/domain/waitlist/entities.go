package waitlist

import (
	"time"
)

// WaitlistEntry tracks customers waiting for slots to open.
type WaitlistEntry struct {
	ID          uint64     `gorm:"column:id;primaryKey"`
	CustomerID  uint64     `gorm:"column:customer_id;not null;index"`
	ServiceID   uint64     `gorm:"column:service_id;not null;index"`
	ProviderID  uint64     `gorm:"column:provider_id;not null;index"`
	DesiredDate time.Time  `gorm:"column:desired_date;not null"`
	Status      string     `gorm:"column:status;size:50;default:'waiting'"`
	NotifiedAt  *time.Time `gorm:"column:notified_at"`
	ExpiresAt   *time.Time `gorm:"column:expires_at"`
	CreatedAt   time.Time  `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time  `gorm:"column:updated_at;autoUpdateTime"`
}

func (WaitlistEntry) TableName() string { return "waitlist_entries" }
