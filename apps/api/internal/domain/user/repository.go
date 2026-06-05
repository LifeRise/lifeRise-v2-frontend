package user

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines the persistence contract for User aggregates.
type Repository interface {
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*User, error)
	GetByEmail(ctx context.Context, db *gorm.DB, email string) (*User, error)
	GetByPhone(ctx context.Context, db *gorm.DB, phone string) (*User, error)
	Create(ctx context.Context, db *gorm.DB, user *User) error
	Update(ctx context.Context, db *gorm.DB, user *User) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error

	// Role & Permission lookups
	GetRoleBySlug(ctx context.Context, db *gorm.DB, slug string) (*Role, error)
	GetPermissionsByRoleID(ctx context.Context, db *gorm.DB, roleID uint64) ([]Permission, error)
	GetUserRoleAssignments(ctx context.Context, db *gorm.DB, userID uint64) ([]UserRoleAssignment, error)

	// Role assignments
	CreateRoleAssignment(ctx context.Context, db *gorm.DB, assignment *UserRoleAssignment) error

	// Password reset
	CreatePasswordReset(ctx context.Context, db *gorm.DB, pr *PasswordReset) error
	GetPasswordResetByToken(ctx context.Context, db *gorm.DB, token string) (*PasswordReset, error)
	DeletePasswordResetsByEmail(ctx context.Context, db *gorm.DB, email string) error
}
