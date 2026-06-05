package company

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Company represents a business entity (complex, vendor organization, etc.).
type Company struct {
	ID          uint64         `gorm:"column:id;primaryKey"`
	Name        string         `gorm:"column:name;size:255;not null"`
	Slug        string         `gorm:"column:slug;size:255;uniqueIndex;not null"`
	LegalName   *string        `gorm:"column:legal_name;size:255"`
	Email       string         `gorm:"column:email;size:255;index"`
	Phone       *string        `gorm:"column:phone;size:50"`
	Website     *string        `gorm:"column:website;size:500"`
	Logo        *string        `gorm:"column:logo;size:500"`
	Description *string        `gorm:"column:description;type:text"`
	Address     datatypes.JSON `gorm:"column:address;type:jsonb"`
	Status      string         `gorm:"column:status;size:50;default:'active'"` // "active", "pending", "suspended", "inactive"
	Settings    datatypes.JSON `gorm:"column:settings;type:jsonb"`
	Timezone    string         `gorm:"column:timezone;size:100;default:'UTC'"`
	Currency    string         `gorm:"column:currency;size:3;default:'USD'"`
	OwnerID     *uint64        `gorm:"column:owner_id;index"`
	VerifiedAt  *time.Time     `gorm:"column:verified_at"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (Company) TableName() string { return "companies" }

// CompanyUser is the pivot table linking users to companies with their roles.
type CompanyUser struct {
	ID        uint64    `gorm:"column:id;primaryKey"`
	CompanyID uint64    `gorm:"column:company_id;not null;index"`
	UserID    uint64    `gorm:"column:user_id;not null;index"`
	RoleID    uint64    `gorm:"column:role_id;not null"`
	JoinedAt  time.Time `gorm:"column:joined_at"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (CompanyUser) TableName() string { return "company_users" }
