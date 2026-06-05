package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/service"
)

// UseCase handles service catalog operations.
type UseCase struct {
	db   *gorm.DB
	repo service.Repository
}

// NewUseCase creates a new service UseCase.
func NewUseCase(db *gorm.DB, repo service.Repository) *UseCase {
	return &UseCase{db: db, repo: repo}
}

// ListServicesRequest holds query parameters for service listings.
type ListServicesRequest struct {
	CategorySlug string
	ProviderID   *uint64
	CompanyID    *uint64
	Search       string
	IsFeatured   *bool
	Page         int
	PerPage      int
}

// ListServices returns a paginated list of active services.
func (uc *UseCase) ListServices(ctx context.Context, req ListServicesRequest) ([]service.Service, int64, error) {
	filter := service.ListFilter{
		ProviderID: req.ProviderID,
		CompanyID:  req.CompanyID,
		Status:     "active",
		Search:     req.Search,
		IsFeatured: req.IsFeatured,
		Page:       req.Page,
		PerPage:    req.PerPage,
	}

	if req.CategorySlug != "" {
		cat, err := uc.repo.GetCategoryBySlug(ctx, uc.db, req.CategorySlug)
		if err == nil {
			filter.CategoryID = &cat.ID
		}
	}

	return uc.repo.List(ctx, uc.db, filter)
}

// GetService retrieves a single service by ID.
func (uc *UseCase) GetService(ctx context.Context, id uint64) (*service.Service, error) {
	return uc.repo.GetByID(ctx, uc.db, id)
}

// CreateServiceRequest holds parameters for creating a service.
type CreateServiceRequest struct {
	CompanyID        *uint64
	ProviderID       uint64
	CategoryID       *uint64
	Name             string
	Description      *string
	ShortDescription *string
	Price            float64
	Currency         string
	Duration         int
	BufferTime       int
	MaxParticipants  int
	LocationType     string
	Images           interface{}
}

// CreateService creates a new service.
func (uc *UseCase) CreateService(ctx context.Context, req CreateServiceRequest) (*service.Service, error) {
	slug := generateSlug(req.Name)

	// Check slug uniqueness
	_, err := uc.repo.GetBySlug(ctx, uc.db, slug)
	if err == nil {
		// append a suffix to make unique
		slug = fmt.Sprintf("%s-%d", slug, timeNowUnix())
	}

	price := decimal.NewFromFloat(req.Price)
	currency := req.Currency
	if currency == "" {
		currency = "USD"
	}

	svc := &service.Service{
		CompanyID:        req.CompanyID,
		ProviderID:       req.ProviderID,
		CategoryID:       req.CategoryID,
		Name:             req.Name,
		Slug:             slug,
		Description:      req.Description,
		ShortDescription: req.ShortDescription,
		Price:            price,
		Currency:         currency,
		Duration:         req.Duration,
		BufferTime:       req.BufferTime,
		MaxParticipants:  req.MaxParticipants,
		LocationType:     req.LocationType,
		Status:           "active",
	}
	if svc.LocationType == "" {
		svc.LocationType = "provider"
	}

	if err := uc.repo.Create(ctx, uc.db, svc); err != nil {
		return nil, fmt.Errorf("create service: %w", err)
	}
	return svc, nil
}

// UpdateService updates an existing service.
func (uc *UseCase) UpdateService(ctx context.Context, id uint64, req CreateServiceRequest) (*service.Service, error) {
	svc, err := uc.repo.GetByID(ctx, uc.db, id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" && req.Name != svc.Name {
		svc.Name = req.Name
		newSlug := generateSlug(req.Name)
		_, err := uc.repo.GetBySlug(ctx, uc.db, newSlug)
		if err != nil {
			svc.Slug = newSlug
		}
	}
	if req.Description != nil {
		svc.Description = req.Description
	}
	if req.ShortDescription != nil {
		svc.ShortDescription = req.ShortDescription
	}
	if req.Price > 0 {
		svc.Price = decimal.NewFromFloat(req.Price)
	}
	if req.Currency != "" {
		svc.Currency = req.Currency
	}
	if req.Duration > 0 {
		svc.Duration = req.Duration
	}
	if req.MaxParticipants > 0 {
		svc.MaxParticipants = req.MaxParticipants
	}
	if req.CategoryID != nil {
		svc.CategoryID = req.CategoryID
	}

	if err := uc.repo.Update(ctx, uc.db, svc); err != nil {
		return nil, fmt.Errorf("update service: %w", err)
	}
	return svc, nil
}

// DeleteService soft-deletes a service.
func (uc *UseCase) DeleteService(ctx context.Context, id uint64) error {
	if _, err := uc.repo.GetByID(ctx, uc.db, id); err != nil {
		return err
	}
	return uc.repo.Delete(ctx, uc.db, id)
}

// ListCategories returns all active service categories.
func (uc *UseCase) ListCategories(ctx context.Context) ([]service.ServiceCategory, error) {
	return uc.repo.ListCategories(ctx, uc.db)
}

// GetCategory retrieves a category by slug.
func (uc *UseCase) GetCategory(ctx context.Context, slug string) (*service.ServiceCategory, error) {
	return uc.repo.GetCategoryBySlug(ctx, uc.db, slug)
}

func generateSlug(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")
	var result strings.Builder
	for _, r := range slug {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' {
			result.WriteRune(r)
		}
	}
	return strings.Trim(result.String(), "-")
}

func timeNowUnix() int64 {
	return time.Now().Unix()
}
