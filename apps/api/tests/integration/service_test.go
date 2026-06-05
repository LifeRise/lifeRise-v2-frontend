package integration

import (
	"context"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	appservice "github.com/liferise/backend/internal/application/service"
	"github.com/liferise/backend/internal/domain/service"
)

// ── Fake Service Repo ──────────────────────────────────────────

type fakeServiceRepo struct {
	services   map[uint64]*service.Service
	bySlug     map[string]*service.Service
	categories map[string]*service.ServiceCategory
	nextID     uint64
}

func newFakeServiceRepo() *fakeServiceRepo {
	return &fakeServiceRepo{
		services:   make(map[uint64]*service.Service),
		bySlug:     make(map[string]*service.Service),
		categories: make(map[string]*service.ServiceCategory),
		nextID:     1,
	}
}

func (r *fakeServiceRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*service.Service, error) {
	s, ok := r.services[id]
	if !ok {
		return nil, assert.AnError
	}
	return s, nil
}

func (r *fakeServiceRepo) GetBySlug(_ context.Context, _ *gorm.DB, slug string) (*service.Service, error) {
	s, ok := r.bySlug[slug]
	if !ok {
		return nil, assert.AnError
	}
	return s, nil
}

func (r *fakeServiceRepo) List(_ context.Context, _ *gorm.DB, filter service.ListFilter) ([]service.Service, int64, error) {
	var results []service.Service
	for _, s := range r.services {
		if filter.Status != "" && s.Status != filter.Status {
			continue
		}
		if filter.CategoryID != nil && s.CategoryID != nil && *s.CategoryID != *filter.CategoryID {
			continue
		}
		if filter.ProviderID != nil && s.ProviderID != *filter.ProviderID {
			continue
		}
		results = append(results, *s)
	}
	return results, int64(len(results)), nil
}

func (r *fakeServiceRepo) Create(_ context.Context, _ *gorm.DB, s *service.Service) error {
	s.ID = r.nextID
	r.nextID++
	r.services[s.ID] = s
	r.bySlug[s.Slug] = s
	return nil
}

func (r *fakeServiceRepo) Update(_ context.Context, _ *gorm.DB, s *service.Service) error {
	r.services[s.ID] = s
	return nil
}

func (r *fakeServiceRepo) Delete(_ context.Context, _ *gorm.DB, id uint64) error {
	delete(r.services, id)
	return nil
}

func (r *fakeServiceRepo) GetCategoryBySlug(_ context.Context, _ *gorm.DB, slug string) (*service.ServiceCategory, error) {
	c, ok := r.categories[slug]
	if !ok {
		return nil, assert.AnError
	}
	return c, nil
}

func (r *fakeServiceRepo) ListCategories(_ context.Context, _ *gorm.DB) ([]service.ServiceCategory, error) {
	var cats []service.ServiceCategory
	for _, c := range r.categories {
		cats = append(cats, *c)
	}
	return cats, nil
}

func (r *fakeServiceRepo) GetCategoryByID(_ context.Context, _ *gorm.DB, id uint64) (*service.ServiceCategory, error) {
	for _, c := range r.categories {
		if c.ID == id {
			return c, nil
		}
	}
	return nil, assert.AnError
}

func (r *fakeServiceRepo) CreateCategory(_ context.Context, _ *gorm.DB, cat *service.ServiceCategory) error {
	cat.ID = r.nextID
	r.nextID++
	r.categories[cat.Slug] = cat
	return nil
}

func (r *fakeServiceRepo) UpdateCategory(_ context.Context, _ *gorm.DB, cat *service.ServiceCategory) error {
	r.categories[cat.Slug] = cat
	return nil
}

func (r *fakeServiceRepo) DeleteCategory(_ context.Context, _ *gorm.DB, id uint64) error {
	for slug, c := range r.categories {
		if c.ID == id {
			delete(r.categories, slug)
			break
		}
	}
	return nil
}

// ── Tests ──────────────────────────────────────────────────────

func TestServiceUseCase_CreateAndGet(t *testing.T) {
	repo := newFakeServiceRepo()
	uc := appservice.NewUseCase(nil, repo)
	ctx := context.Background()

	svc, err := uc.CreateService(ctx, appservice.CreateServiceRequest{
		Name:       "Test Massage",
		Price:      99.99,
		Currency:   "USD",
		Duration:   60,
		ProviderID: 1,
	})
	require.NoError(t, err)
	assert.NotZero(t, svc.ID)
	assert.Equal(t, "Test Massage", svc.Name)
	assert.Equal(t, "test-massage", svc.Slug)
	assert.True(t, svc.Price.Equal(decimal.NewFromFloat(99.99)))
	assert.Equal(t, "USD", svc.Currency)

	// Get by ID
	found, err := uc.GetService(ctx, svc.ID)
	require.NoError(t, err)
	assert.Equal(t, svc.ID, found.ID)
}

func TestServiceUseCase_ListWithFilters(t *testing.T) {
	repo := newFakeServiceRepo()
	uc := appservice.NewUseCase(nil, repo)
	ctx := context.Background()

	// Seed services
	_, _ = uc.CreateService(ctx, appservice.CreateServiceRequest{Name: "Massage A", Price: 50, Duration: 30, ProviderID: 1})
	_, _ = uc.CreateService(ctx, appservice.CreateServiceRequest{Name: "Massage B", Price: 75, Duration: 45, ProviderID: 1})
	_, _ = uc.CreateService(ctx, appservice.CreateServiceRequest{Name: "Facial C", Price: 100, Duration: 60, ProviderID: 2})

	results, total, err := uc.ListServices(ctx, appservice.ListServicesRequest{Page: 1, PerPage: 10})
	require.NoError(t, err)
	assert.Equal(t, int64(3), total)
	assert.Len(t, results, 3)

	// Filter by provider
	pid := uint64(1)
	results, total, err = uc.ListServices(ctx, appservice.ListServicesRequest{ProviderID: &pid, Page: 1, PerPage: 10})
	require.NoError(t, err)
	assert.Equal(t, int64(2), total)
	assert.Len(t, results, 2)
}

func TestServiceUseCase_UpdateAndDelete(t *testing.T) {
	repo := newFakeServiceRepo()
	uc := appservice.NewUseCase(nil, repo)
	ctx := context.Background()

	svc, _ := uc.CreateService(ctx, appservice.CreateServiceRequest{Name: "Old Name", Price: 50, Duration: 30, ProviderID: 1})

	updated, err := uc.UpdateService(ctx, svc.ID, appservice.CreateServiceRequest{
		Name:  "New Name",
		Price: 75,
	})
	require.NoError(t, err)
	assert.Equal(t, "New Name", updated.Name)
	assert.True(t, updated.Price.Equal(decimal.NewFromFloat(75)))

	err = uc.DeleteService(ctx, svc.ID)
	require.NoError(t, err)

	_, err = uc.GetService(ctx, svc.ID)
	assert.Error(t, err)
}
