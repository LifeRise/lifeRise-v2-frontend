package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/user"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// UserRepo implements user.Repository with GORM.
type UserRepo struct{}

// NewUserRepo creates a new UserRepo.
func NewUserRepo() *UserRepo { return &UserRepo{} }

func (r *UserRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*user.User, error) {
	var u user.User
	if err := db.WithContext(ctx).First(&u, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, db *gorm.DB, email string) (*user.User, error) {
	var u user.User
	if err := db.WithContext(ctx).Where("email = ?", email).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) GetByPhone(ctx context.Context, db *gorm.DB, phone string) (*user.User, error) {
	var u user.User
	if err := db.WithContext(ctx).Where("phone = ?", phone).First(&u).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &u, nil
}

func (r *UserRepo) Create(ctx context.Context, db *gorm.DB, u *user.User) error {
	return db.WithContext(ctx).Create(u).Error
}

func (r *UserRepo) Update(ctx context.Context, db *gorm.DB, u *user.User) error {
	return db.WithContext(ctx).Save(u).Error
}

func (r *UserRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&user.User{}, id).Error
}

func (r *UserRepo) GetRoleBySlug(ctx context.Context, db *gorm.DB, slug string) (*user.Role, error) {
	var role user.Role
	if err := db.WithContext(ctx).Where("slug = ?", slug).First(&role).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &role, nil
}

func (r *UserRepo) GetPermissionsByRoleID(ctx context.Context, db *gorm.DB, roleID uint64) ([]user.Permission, error) {
	var role user.Role
	if err := db.WithContext(ctx).Preload("Permissions").First(&role, roleID).Error; err != nil {
		return nil, err
	}
	return role.Permissions, nil
}

func (r *UserRepo) GetUserRoleAssignments(ctx context.Context, db *gorm.DB, userID uint64) ([]user.UserRoleAssignment, error) {
	var assignments []user.UserRoleAssignment
	if err := db.WithContext(ctx).Where("user_id = ?", userID).Preload("Role").Find(&assignments).Error; err != nil {
		return nil, err
	}
	return assignments, nil
}

func (r *UserRepo) CreateRoleAssignment(ctx context.Context, db *gorm.DB, a *user.UserRoleAssignment) error {
	return db.WithContext(ctx).Create(a).Error
}

func (r *UserRepo) CreatePasswordReset(ctx context.Context, db *gorm.DB, pr *user.PasswordReset) error {
	return db.WithContext(ctx).Create(pr).Error
}

func (r *UserRepo) GetPasswordResetByToken(ctx context.Context, db *gorm.DB, token string) (*user.PasswordReset, error) {
	var pr user.PasswordReset
	if err := db.WithContext(ctx).Where("token = ?", token).First(&pr).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &pr, nil
}

func (r *UserRepo) DeletePasswordResetsByEmail(ctx context.Context, db *gorm.DB, email string) error {
	return db.WithContext(ctx).Where("email = ?", email).Delete(&user.PasswordReset{}).Error
}
