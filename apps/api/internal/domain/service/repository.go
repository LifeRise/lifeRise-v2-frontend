package service

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for Service aggregates.
type Repository interface {
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Service, error)
	GetBySlug(ctx context.Context, db *gorm.DB, slug string) (*Service, error)
	List(ctx context.Context, db *gorm.DB, filter ListFilter) ([]Service, int64, error)
	Create(ctx context.Context, db *gorm.DB, svc *Service) error
	Update(ctx context.Context, db *gorm.DB, svc *Service) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error

	GetCategoryBySlug(ctx context.Context, db *gorm.DB, slug string) (*ServiceCategory, error)
	ListCategories(ctx context.Context, db *gorm.DB) ([]ServiceCategory, error)
}

// ListFilter holds query parameters for service listings.
type ListFilter struct {
	CategoryID *uint64
	ProviderID *uint64
	CompanyID  *uint64
	Status     string
	Search     string
	IsFeatured *bool
	Page       int
	PerPage    int
}
