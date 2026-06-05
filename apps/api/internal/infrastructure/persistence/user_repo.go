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

// List retrieves users with filters and pagination.
func (r *UserRepo) List(ctx context.Context, db *gorm.DB, role string, status string, search string, page, perPage int) ([]user.User, int64, error) {
	var users []user.User
	var total int64

	query := db.WithContext(ctx).Model(&user.User{}).Where("users.deleted_at IS NULL")
	if role != "" {
		query = query.Joins("JOIN user_role_assignments ON user_role_assignments.user_id = users.id").
			Joins("JOIN roles ON roles.id = user_role_assignments.role_id").
			Where("roles.slug = ?", role)
	}
	if status != "" {
		query = query.Where("users.status = ?", status)
	}
	if search != "" {
		query = query.Where("users.first_name ILIKE ? OR users.last_name ILIKE ? OR users.email ILIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("users.created_at DESC").Limit(perPage).Offset(offset).Find(&users).Error; err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

// ListRoleAssignmentsByUserID returns role assignments for a user.
func (r *UserRepo) ListRoleAssignmentsByUserID(ctx context.Context, db *gorm.DB, userID uint64) ([]user.UserRoleAssignment, error) {
	var assignments []user.UserRoleAssignment
	if err := db.WithContext(ctx).Where("user_id = ?", userID).Preload("Role").Find(&assignments).Error; err != nil {
		return nil, err
	}
	return assignments, nil
}

// ListRoles retrieves all roles.
func (r *UserRepo) ListRoles(ctx context.Context, db *gorm.DB, search string, page, perPage int) ([]user.Role, int64, error) {
	var roles []user.Role
	var total int64

	query := db.WithContext(ctx).Model(&user.Role{}).Where("deleted_at IS NULL")
	if search != "" {
		query = query.Where("name ILIKE ? OR slug ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("level DESC, name ASC").Limit(perPage).Offset(offset).Find(&roles).Error; err != nil {
		return nil, 0, err
	}
	return roles, total, nil
}

// GetRoleByID retrieves a role by ID.
func (r *UserRepo) GetRoleByID(ctx context.Context, db *gorm.DB, id uint64) (*user.Role, error) {
	var role user.Role
	if err := db.WithContext(ctx).Preload("Permissions").First(&role, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &role, nil
}

// UpdateRole persists changes to a role.
func (r *UserRepo) UpdateRole(ctx context.Context, db *gorm.DB, role *user.Role) error {
	return db.WithContext(ctx).Save(role).Error
}

// DeleteRole soft-deletes a role.
func (r *UserRepo) DeleteRole(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&user.Role{}, id).Error
}

// SetRolePermissions replaces a role's permissions.
func (r *UserRepo) SetRolePermissions(ctx context.Context, db *gorm.DB, roleID uint64, permissionIDs []uint64) error {
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("role_id = ?", roleID).Delete(&user.RolePermission{}).Error; err != nil {
			return err
		}
		for _, pid := range permissionIDs {
			if err := tx.Create(&user.RolePermission{RoleID: roleID, PermissionID: pid}).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// ListPermissions retrieves all permissions.
func (r *UserRepo) ListPermissions(ctx context.Context, db *gorm.DB) ([]user.Permission, error) {
	var permissions []user.Permission
	if err := db.WithContext(ctx).Where("deleted_at IS NULL").Order("module ASC, name ASC").Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}
