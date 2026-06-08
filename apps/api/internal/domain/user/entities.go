package user

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// User represents a system user (admin, vendor, staff, etc.).
type User struct {
	ID                    uint64         `gorm:"column:id;primaryKey" json:"id"`
	FirstName             string         `gorm:"column:first_name;size:255" json:"first_name"`
	LastName              string         `gorm:"column:last_name;size:255" json:"last_name"`
	Email                 string         `gorm:"column:email;size:255;index" json:"email"`
	Phone                 string         `gorm:"column:phone;size:50;index" json:"phone"`
	PasswordHash          string         `gorm:"column:password;size:255" json:"-"`
	RoleID                *uint64        `gorm:"column:role_id" json:"role_id,omitempty"`
	EmailVerifiedAt       *time.Time     `gorm:"column:email_verified_at" json:"email_verified_at,omitempty"`
	PhoneVerifiedAt       *time.Time     `gorm:"column:phone_verified_at" json:"phone_verified_at,omitempty"`
	EmailUniqueIfVerified *string        `gorm:"->;column:email_unique_if_verified" json:"-"` // read-only generated column
	PhoneUniqueIfVerified *string        `gorm:"->;column:phone_unique_if_verified" json:"-"` // read-only generated column
	Timezone              string         `gorm:"column:timezone;size:100;default:'UTC'" json:"timezone"`
	Locale                string         `gorm:"column:locale;size:10;default:'en'" json:"locale"`
	Avatar                *string        `gorm:"column:avatar;size:500" json:"avatar,omitempty"`
	Status                string         `gorm:"column:status;size:50;default:'active'" json:"status"`
	RememberToken         *string        `gorm:"column:remember_token;size:100" json:"-"`
	LastLoginAt           *time.Time     `gorm:"column:last_login_at" json:"last_login_at,omitempty"`
	Settings              datatypes.JSON `gorm:"column:settings;type:jsonb" json:"settings,omitempty"`
	CreatedAt             time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt             time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt             gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`

	// Associations
	Role            *Role                `gorm:"foreignKey:role_id" json:"role,omitempty"`
	RoleAssignments []UserRoleAssignment `gorm:"foreignKey:user_id" json:"role_assignments,omitempty"`
}

func (User) TableName() string { return "users" }

// Role represents a system role.
type Role struct {
	ID          uint64         `gorm:"column:id;primaryKey" json:"id"`
	Name        string         `gorm:"column:name;size:255;not null" json:"name"`
	Slug        string         `gorm:"column:slug;size:255;uniqueIndex;not null" json:"slug"`
	Description *string        `gorm:"column:description;type:text" json:"description,omitempty"`
	Level       int            `gorm:"column:level;default:0" json:"level"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`

	Permissions []Permission `gorm:"many2many:role_permissions;joinForeignKey:role_id;joinReferences:permission_id" json:"permissions,omitempty"`
}

func (Role) TableName() string { return "roles" }

// Permission represents a granular permission.
type Permission struct {
	ID          uint64         `gorm:"column:id;primaryKey" json:"id"`
	Name        string         `gorm:"column:name;size:255;not null" json:"name"`
	Slug        string         `gorm:"column:slug;size:255;uniqueIndex;not null" json:"slug"`
	Module      string         `gorm:"column:module;size:100" json:"module"`
	Description *string        `gorm:"column:description;type:text" json:"description,omitempty"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Permission) TableName() string { return "permissions" }

// RolePermission is the pivot table between roles and permissions.
type RolePermission struct {
	RoleID       uint64    `gorm:"column:role_id;primaryKey" json:"role_id"`
	PermissionID uint64    `gorm:"column:permission_id;primaryKey" json:"permission_id"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (RolePermission) TableName() string { return "role_permissions" }

// UserRoleAssignment tracks company-scoped role assignments for users.
// A user can have different roles for different companies.
type UserRoleAssignment struct {
	ID        uint64    `gorm:"column:id;primaryKey" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	RoleID    uint64    `gorm:"column:role_id;not null;index" json:"role_id"`
	CompanyID *uint64   `gorm:"column:company_id;index" json:"company_id,omitempty"` // nil for global roles
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`

	Role *Role `gorm:"foreignKey:role_id" json:"role,omitempty"`
	User *User `gorm:"foreignKey:user_id" json:"user,omitempty"`
}

func (UserRoleAssignment) TableName() string { return "user_role_assignments" }

// UserOTP stores OTP codes for user authentication flows.
type UserOTP struct {
	ID        uint64     `gorm:"column:id;primaryKey" json:"id"`
	UserID    uint64     `gorm:"column:user_id;not null;index" json:"user_id"`
	Code      string     `gorm:"column:code;size:10;not null" json:"code"`
	Type      string     `gorm:"column:type;size:50;not null" json:"type"` // "login", "password_reset", "phone_verify"
	ExpiresAt time.Time  `gorm:"column:expires_at;not null" json:"expires_at"`
	UsedAt    *time.Time `gorm:"column:used_at" json:"used_at,omitempty"`
	CreatedAt time.Time  `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (UserOTP) TableName() string { return "user_otps" }

// PasswordReset stores password reset tokens.
type PasswordReset struct {
	ID        uint64    `gorm:"column:id;primaryKey" json:"id"`
	Email     string    `gorm:"column:email;size:255;not null;index" json:"email"`
	Token     string    `gorm:"column:token;size:255;not null;index" json:"token"`
	Code      *string   `gorm:"column:code;size:10" json:"code,omitempty"`
	ExpiresAt time.Time `gorm:"column:expires_at;not null" json:"expires_at"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
}

func (PasswordReset) TableName() string { return "password_resets" }

// DeviceToken stores an FCM registration token for push delivery.
type DeviceToken struct {
	ID        uint64    `gorm:"column:id;primaryKey" json:"id"`
	UserID    uint64    `gorm:"column:user_id;not null;index" json:"user_id"`
	Token     string    `gorm:"column:token;size:512;not null;uniqueIndex" json:"token"`
	Platform  string    `gorm:"column:platform;size:20;not null;default:'web'" json:"platform"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (DeviceToken) TableName() string { return "device_tokens" }

// Role references in domain layer use pkg/auth.RoleSlug constants.
