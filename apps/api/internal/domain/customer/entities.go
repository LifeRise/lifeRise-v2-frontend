package customer

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Customer represents a customer (end-user of the mobile app).
type Customer struct {
	ID              uint64         `gorm:"column:id;primaryKey" json:"id"`
	FirstName       string         `gorm:"column:first_name;size:255" json:"first_name"`
	LastName        string         `gorm:"column:last_name;size:255" json:"last_name"`
	Email           string         `gorm:"column:email;size:255;uniqueIndex" json:"email"`
	Phone           string         `gorm:"column:phone;size:50;index" json:"phone"`
	PasswordHash    string         `gorm:"column:password;size:255" json:"-"`
	EmailVerifiedAt *time.Time     `gorm:"column:email_verified_at" json:"email_verified_at,omitempty"`
	PhoneVerifiedAt *time.Time     `gorm:"column:phone_verified_at" json:"phone_verified_at,omitempty"`
	Timezone        string         `gorm:"column:timezone;size:100;default:'UTC'" json:"timezone"`
	Locale          string         `gorm:"column:locale;size:10;default:'en'" json:"locale"`
	Avatar          *string        `gorm:"column:avatar;size:500" json:"avatar,omitempty"`
	Status          string         `gorm:"column:status;size:50;default:'active'" json:"status"`
	ReferralCode    *string        `gorm:"column:referral_code;size:50;uniqueIndex" json:"referral_code,omitempty"`
	ReferredBy      *uint64        `gorm:"column:referred_by" json:"referred_by,omitempty"`
	Settings        datatypes.JSON `gorm:"column:settings;type:jsonb" json:"settings,omitempty"`
	LastLoginAt     *time.Time     `gorm:"column:last_login_at" json:"last_login_at,omitempty"`
	CreatedAt       time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Customer) TableName() string { return "customers" }

// CustomerOTP stores OTP codes for customer authentication flows.
type CustomerOTP struct {
	ID         uint64     `gorm:"column:id;primaryKey" json:"id"`
	CustomerID uint64     `gorm:"column:customer_id;not null;index" json:"customer_id"`
	Code       string     `gorm:"column:code;size:10;not null" json:"code"`
	Type       string     `gorm:"column:type;size:50;not null" json:"type"` // "login", "password_reset", "phone_verify", "signup"
	ExpiresAt  time.Time  `gorm:"column:expires_at;not null" json:"expires_at"`
	UsedAt     *time.Time `gorm:"column:used_at" json:"used_at,omitempty"`
	CreatedAt  time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (CustomerOTP) TableName() string { return "customer_otps" }
