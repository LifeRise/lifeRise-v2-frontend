package persistence

import (
	"context"
	"errors"
	"fmt"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/service"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// ServiceRepo implements service.Repository with GORM.
type ServiceRepo struct{}

// NewServiceRepo creates a new ServiceRepo.
func NewServiceRepo() *ServiceRepo { return &ServiceRepo{} }

func (r *ServiceRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*service.Service, error) {
	var s service.Service
	if err := db.WithContext(ctx).Preload("Category").First(&s, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (r *ServiceRepo) GetBySlug(ctx context.Context, db *gorm.DB, slug string) (*service.Service, error) {
	var s service.Service
	if err := db.WithContext(ctx).Preload("Category").Where("slug = ?", slug).First(&s).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

func (r *ServiceRepo) List(ctx context.Context, db *gorm.DB, filter service.ListFilter) ([]service.Service, int64, error) {
	query := db.WithContext(ctx).Model(&service.Service{}).Preload("Category")

	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	} else {
		query = query.Where("status = ?", "active")
	}

	if filter.CategoryID != nil {
		query = query.Where("category_id = ?", *filter.CategoryID)
	}
	if filter.ProviderID != nil {
		query = query.Where("provider_id = ?", *filter.ProviderID)
	}
	if filter.CompanyID != nil {
		query = query.Where("company_id = ?", *filter.CompanyID)
	}
	if filter.IsFeatured != nil {
		query = query.Where("is_featured = ?", *filter.IsFeatured)
	}
	if filter.Search != "" {
		search := fmt.Sprintf("%%%s%%", filter.Search)
		query = query.Where("name LIKE ? OR description LIKE ?", search, search)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage < 1 {
		perPage = 15
	}
	if perPage > 100 {
		perPage = 100
	}

	var results []service.Service
	offset := (page - 1) * perPage
	if err := query.Order("sort_order asc, id desc").Offset(offset).Limit(perPage).Find(&results).Error; err != nil {
		return nil, 0, err
	}

	return results, total, nil
}

func (r *ServiceRepo) Create(ctx context.Context, db *gorm.DB, svc *service.Service) error {
	return db.WithContext(ctx).Create(svc).Error
}

func (r *ServiceRepo) Update(ctx context.Context, db *gorm.DB, svc *service.Service) error {
	return db.WithContext(ctx).Save(svc).Error
}

func (r *ServiceRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&service.Service{}, id).Error
}

func (r *ServiceRepo) GetCategoryBySlug(ctx context.Context, db *gorm.DB, slug string) (*service.ServiceCategory, error) {
	var cat service.ServiceCategory
	if err := db.WithContext(ctx).Where("slug = ?", slug).First(&cat).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &cat, nil
}

func (r *ServiceRepo) ListCategories(ctx context.Context, db *gorm.DB) ([]service.ServiceCategory, error) {
	var cats []service.ServiceCategory
	if err := db.WithContext(ctx).Where("is_active = ?", true).Order("sort_order asc").Find(&cats).Error; err != nil {
		return nil, err
	}
	return cats, nil
}

func (r *ServiceRepo) GetCategoryByID(ctx context.Context, db *gorm.DB, id uint64) (*service.ServiceCategory, error) {
	var cat service.ServiceCategory
	if err := db.WithContext(ctx).First(&cat, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &cat, nil
}

func (r *ServiceRepo) CreateCategory(ctx context.Context, db *gorm.DB, cat *service.ServiceCategory) error {
	return db.WithContext(ctx).Create(cat).Error
}

func (r *ServiceRepo) UpdateCategory(ctx context.Context, db *gorm.DB, cat *service.ServiceCategory) error {
	return db.WithContext(ctx).Save(cat).Error
}

func (r *ServiceRepo) DeleteCategory(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&service.ServiceCategory{}, id).Error
}
