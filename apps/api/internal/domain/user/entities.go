package user

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// User represents a system user (admin, vendor, staff, etc.).
type User struct {
	ID                    uint64         `gorm:"column:id;primaryKey"`
	FirstName             string         `gorm:"column:first_name;size:255"`
	LastName              string         `gorm:"column:last_name;size:255"`
	Email                 string         `gorm:"column:email;size:255;index"`
	Phone                 string         `gorm:"column:phone;size:50;index"`
	PasswordHash          string         `gorm:"column:password;size:255"`
	RoleID                *uint64        `gorm:"column:role_id"`
	EmailVerifiedAt       *time.Time     `gorm:"column:email_verified_at"`
	PhoneVerifiedAt       *time.Time     `gorm:"column:phone_verified_at"`
	EmailUniqueIfVerified *string        `gorm:"->;column:email_unique_if_verified"` // read-only generated column
	PhoneUniqueIfVerified *string        `gorm:"->;column:phone_unique_if_verified"` // read-only generated column
	Timezone              string         `gorm:"column:timezone;size:100;default:'UTC'"`
	Locale                string         `gorm:"column:locale;size:10;default:'en'"`
	Avatar                *string        `gorm:"column:avatar;size:500"`
	Status                string         `gorm:"column:status;size:50;default:'active'"`
	RememberToken         *string        `gorm:"column:remember_token;size:100"`
	LastLoginAt           *time.Time     `gorm:"column:last_login_at"`
	Settings              datatypes.JSON `gorm:"column:settings;type:jsonb"`
	CreatedAt             time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt             time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt             gorm.DeletedAt `gorm:"column:deleted_at;index"`

	// Associations
	Role            *Role                `gorm:"foreignKey:role_id"`
	RoleAssignments []UserRoleAssignment `gorm:"foreignKey:user_id"`
}

func (User) TableName() string { return "users" }

// Role represents a system role.
type Role struct {
	ID          uint64         `gorm:"column:id;primaryKey"`
	Name        string         `gorm:"column:name;size:255;not null"`
	Slug        string         `gorm:"column:slug;size:255;uniqueIndex;not null"`
	Description *string        `gorm:"column:description;type:text"`
	Level       int            `gorm:"column:level;default:0"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"`

	Permissions []Permission `gorm:"many2many:role_permissions;joinForeignKey:role_id;joinReferences:permission_id"`
}

func (Role) TableName() string { return "roles" }

// Permission represents a granular permission.
type Permission struct {
	ID          uint64         `gorm:"column:id;primaryKey"`
	Name        string         `gorm:"column:name;size:255;not null"`
	Slug        string         `gorm:"column:slug;size:255;uniqueIndex;not null"`
	Module      string         `gorm:"column:module;size:100"`
	Description *string        `gorm:"column:description;type:text"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (Permission) TableName() string { return "permissions" }

// RolePermission is the pivot table between roles and permissions.
type RolePermission struct {
	RoleID       uint64    `gorm:"column:role_id;primaryKey"`
	PermissionID uint64    `gorm:"column:permission_id;primaryKey"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (RolePermission) TableName() string { return "role_permissions" }

// UserRoleAssignment tracks company-scoped role assignments for users.
// A user can have different roles for different companies.
type UserRoleAssignment struct {
	ID        uint64    `gorm:"column:id;primaryKey"`
	UserID    uint64    `gorm:"column:user_id;not null;index"`
	RoleID    uint64    `gorm:"column:role_id;not null;index"`
	CompanyID *uint64   `gorm:"column:company_id;index"` // nil for global roles
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`

	Role *Role `gorm:"foreignKey:role_id"`
	User *User `gorm:"foreignKey:user_id"`
}

func (UserRoleAssignment) TableName() string { return "user_role_assignments" }

// UserOTP stores OTP codes for user authentication flows.
type UserOTP struct {
	ID        uint64     `gorm:"column:id;primaryKey"`
	UserID    uint64     `gorm:"column:user_id;not null;index"`
	Code      string     `gorm:"column:code;size:10;not null"`
	Type      string     `gorm:"column:type;size:50;not null"` // "login", "password_reset", "phone_verify"
	ExpiresAt time.Time  `gorm:"column:expires_at;not null"`
	UsedAt    *time.Time `gorm:"column:used_at"`
	CreatedAt time.Time  `gorm:"column:created_at;autoCreateTime"`
}

func (UserOTP) TableName() string { return "user_otps" }

// PasswordReset stores password reset tokens.
type PasswordReset struct {
	ID        uint64    `gorm:"column:id;primaryKey"`
	Email     string    `gorm:"column:email;size:255;not null;index"`
	Token     string    `gorm:"column:token;size:255;not null;index"`
	Code      *string   `gorm:"column:code;size:10"`
	ExpiresAt time.Time `gorm:"column:expires_at;not null"`
	CreatedAt time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (PasswordReset) TableName() string { return "password_resets" }

// Role references in domain layer use pkg/auth.RoleSlug constants.
