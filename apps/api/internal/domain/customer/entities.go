package customer

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Customer represents a customer (end-user of the mobile app).
type Customer struct {
	ID              uint64         `gorm:"column:id;primaryKey"`
	FirstName       string         `gorm:"column:first_name;size:255"`
	LastName        string         `gorm:"column:last_name;size:255"`
	Email           string         `gorm:"column:email;size:255;uniqueIndex"`
	Phone           string         `gorm:"column:phone;size:50;index"`
	PasswordHash    string         `gorm:"column:password;size:255"`
	EmailVerifiedAt *time.Time     `gorm:"column:email_verified_at"`
	PhoneVerifiedAt *time.Time     `gorm:"column:phone_verified_at"`
	Timezone        string         `gorm:"column:timezone;size:100;default:'UTC'"`
	Locale          string         `gorm:"column:locale;size:10;default:'en'"`
	Avatar          *string        `gorm:"column:avatar;size:500"`
	Status          string         `gorm:"column:status;size:50;default:'active'"`
	ReferralCode    *string        `gorm:"column:referral_code;size:50;uniqueIndex"`
	ReferredBy      *uint64        `gorm:"column:referred_by"`
	Settings        datatypes.JSON `gorm:"column:settings;type:jsonb"`
	LastLoginAt     *time.Time     `gorm:"column:last_login_at"`
	CreatedAt       time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt       time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt       gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (Customer) TableName() string { return "customers" }

// CustomerOTP stores OTP codes for customer authentication flows.
type CustomerOTP struct {
	ID         uint64     `gorm:"column:id;primaryKey"`
	CustomerID uint64     `gorm:"column:customer_id;not null;index"`
	Code       string     `gorm:"column:code;size:10;not null"`
	Type       string     `gorm:"column:type;size:50;not null"` // "login", "password_reset", "phone_verify", "signup"
	ExpiresAt  time.Time  `gorm:"column:expires_at;not null"`
	UsedAt     *time.Time `gorm:"column:used_at"`
	CreatedAt  time.Time  `gorm:"column:created_at;autoCreateTime"`
}

func (CustomerOTP) TableName() string { return "customer_otps" }
