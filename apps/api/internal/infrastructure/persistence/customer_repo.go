package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/customer"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// CustomerRepo implements customer.Repository with GORM.
type CustomerRepo struct{}

// NewCustomerRepo creates a new CustomerRepo.
func NewCustomerRepo() *CustomerRepo { return &CustomerRepo{} }

func (r *CustomerRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*customer.Customer, error) {
	var c customer.Customer
	if err := db.WithContext(ctx).First(&c, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepo) GetByEmail(ctx context.Context, db *gorm.DB, email string) (*customer.Customer, error) {
	var c customer.Customer
	if err := db.WithContext(ctx).Where("email = ?", email).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepo) GetByPhone(ctx context.Context, db *gorm.DB, phone string) (*customer.Customer, error) {
	var c customer.Customer
	if err := db.WithContext(ctx).Where("phone = ?", phone).First(&c).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (r *CustomerRepo) Create(ctx context.Context, db *gorm.DB, c *customer.Customer) error {
	return db.WithContext(ctx).Create(c).Error
}

func (r *CustomerRepo) Update(ctx context.Context, db *gorm.DB, c *customer.Customer) error {
	return db.WithContext(ctx).Save(c).Error
}

func (r *CustomerRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&customer.Customer{}, id).Error
}

func (r *CustomerRepo) ListAdmin(ctx context.Context, db *gorm.DB, status string, search string, page, perPage int) ([]customer.Customer, int64, error) {
	query := db.WithContext(ctx).Model(&customer.Customer{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("first_name ILIKE ? OR last_name ILIKE ? OR email ILIKE ?", searchPattern, searchPattern, searchPattern)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 25
	}
	if perPage > 100 {
		perPage = 100
	}

	var results []customer.Customer
	offset := (page - 1) * perPage
	if err := query.Order("created_at desc").Offset(offset).Limit(perPage).Find(&results).Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}
