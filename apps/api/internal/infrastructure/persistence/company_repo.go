package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/company"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// CompanyRepo implements company persistence with GORM.
type CompanyRepo struct{}

// NewCompanyRepo creates a new CompanyRepo.
func NewCompanyRepo() *CompanyRepo { return &CompanyRepo{} }

// GetByID retrieves a company by ID.
func (r *CompanyRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*company.Company, error) {
	var c company.Company
	if err := db.WithContext(ctx).First(&c, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

// List retrieves companies with filters and pagination.
func (r *CompanyRepo) List(ctx context.Context, db *gorm.DB, companyType string, status string, search string, page, perPage int) ([]company.Company, int64, error) {
	var companies []company.Company
	var total int64

	query := db.WithContext(ctx).Model(&company.Company{}).Where("deleted_at IS NULL")
	if companyType != "" {
		query = query.Where("type = ?", companyType)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("name ILIKE ? OR email ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("created_at DESC").Limit(perPage).Offset(offset).Find(&companies).Error; err != nil {
		return nil, 0, err
	}
	return companies, total, nil
}

// Create persists a new company.
func (r *CompanyRepo) Create(ctx context.Context, db *gorm.DB, c *company.Company) error {
	return db.WithContext(ctx).Create(c).Error
}

// Update persists changes to a company.
func (r *CompanyRepo) Update(ctx context.Context, db *gorm.DB, c *company.Company) error {
	return db.WithContext(ctx).Save(c).Error
}

// Delete soft-deletes a company.
func (r *CompanyRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&company.Company{}, id).Error
}
