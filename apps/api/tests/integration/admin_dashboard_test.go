package integration

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/liferise/backend/internal/adapters/http/handlers"
	"github.com/liferise/backend/internal/adapters/http/middleware"
	appdashboard "github.com/liferise/backend/internal/application/dashboard"
	"github.com/liferise/backend/internal/domain/dashboard"
	"github.com/liferise/backend/pkg/auth"
)

// ── Fake Dashboard Repo ────────────────────────────────────────

type fakeDashboardRepo struct {
	mu                     sync.RWMutex
	complexManagers        int64
	activeCustomers        int64
	serviceProviders       int64
	bookings               int64
	complexCompanies       int64
	vendorCompanies        int64
	vendorBookingBreakdown dashboard.VendorBookingStatusBreakdown
	eventBookingBreakdown  dashboard.EventBookingStatusBreakdown
	popularServices        []dashboard.PopularService
	mostBookedVendors      []dashboard.MostBookedVendor
	upcomingEvents         []dashboard.UpcomingEvent
	topLocations           []dashboard.TopLocation
	delay                  time.Duration
}

func newFakeDashboardRepo() *fakeDashboardRepo {
	return &fakeDashboardRepo{
		popularServices:   make([]dashboard.PopularService, 0),
		mostBookedVendors: make([]dashboard.MostBookedVendor, 0),
		upcomingEvents:    make([]dashboard.UpcomingEvent, 0),
		topLocations:      make([]dashboard.TopLocation, 0),
	}
}

func (r *fakeDashboardRepo) CountComplexManagers(ctx context.Context, _ *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return 0, err
	}
	if scope.CompanyID != nil {
		if r.complexManagers > 0 {
			return 1, nil
		}
		return 0, nil
	}
	return r.complexManagers, nil
}

func (r *fakeDashboardRepo) CountActiveCustomers(ctx context.Context, _ *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return 0, err
	}
	if scope.CompanyID != nil {
		if r.activeCustomers > 0 {
			return r.activeCustomers / 3, nil
		}
		return 0, nil
	}
	return r.activeCustomers, nil
}

func (r *fakeDashboardRepo) CountServiceProviders(ctx context.Context, _ *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return 0, err
	}
	if scope.CompanyID != nil {
		if r.serviceProviders > 0 {
			return r.serviceProviders / 4, nil
		}
		return 0, nil
	}
	return r.serviceProviders, nil
}

func (r *fakeDashboardRepo) CountBookings(ctx context.Context, _ *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return 0, err
	}
	if scope.CompanyID != nil {
		return r.bookings / 2, nil
	}
	return r.bookings, nil
}

func (r *fakeDashboardRepo) CountComplexCompanies(ctx context.Context, _ *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return 0, err
	}
	if scope.CompanyID != nil {
		if r.complexCompanies > 0 {
			return 1, nil
		}
		return 0, nil
	}
	return r.complexCompanies, nil
}

func (r *fakeDashboardRepo) CountVendorCompanies(ctx context.Context, _ *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return 0, err
	}
	if scope.CompanyID != nil {
		if r.vendorCompanies > 0 {
			return r.vendorCompanies / 3, nil
		}
		return 0, nil
	}
	return r.vendorCompanies, nil
}

func (r *fakeDashboardRepo) VendorBookingStatusBreakdown(ctx context.Context, _ *gorm.DB, _ *dashboard.OverviewScope) (dashboard.VendorBookingStatusBreakdown, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return dashboard.VendorBookingStatusBreakdown{}, err
	}
	return r.vendorBookingBreakdown, nil
}

func (r *fakeDashboardRepo) EventBookingStatusBreakdown(ctx context.Context, _ *gorm.DB, _ *dashboard.OverviewScope) (dashboard.EventBookingStatusBreakdown, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return dashboard.EventBookingStatusBreakdown{}, err
	}
	return r.eventBookingBreakdown, nil
}

func (r *fakeDashboardRepo) PopularServices(ctx context.Context, _ *gorm.DB, _ *dashboard.OverviewScope) ([]dashboard.PopularService, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return nil, err
	}
	return r.popularServices, nil
}

func (r *fakeDashboardRepo) MostBookedVendors(ctx context.Context, _ *gorm.DB, _ *dashboard.OverviewScope) ([]dashboard.MostBookedVendor, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return nil, err
	}
	return r.mostBookedVendors, nil
}

func (r *fakeDashboardRepo) UpcomingEvents(ctx context.Context, _ *gorm.DB, _ *dashboard.OverviewScope) ([]dashboard.UpcomingEvent, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return nil, err
	}
	return r.upcomingEvents, nil
}

func (r *fakeDashboardRepo) TopLocations(ctx context.Context, _ *gorm.DB, _ *dashboard.OverviewScope) ([]dashboard.TopLocation, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if err := r.sleep(ctx); err != nil {
		return nil, err
	}
	return r.topLocations, nil
}

func (r *fakeDashboardRepo) sleep(ctx context.Context) error {
	if r.delay <= 0 {
		return nil
	}
	select {
	case <-time.After(r.delay):
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func setupOverviewUC() (*appdashboard.OverviewUseCase, *fakeDashboardRepo) {
	repo := newFakeDashboardRepo()
	uc := appdashboard.NewOverviewUseCase(nil, repo)
	return uc, repo
}

// ── Tests ──────────────────────────────────────────────────────

func TestDashboardOverview_GlobalScope(t *testing.T) {
	uc, repo := setupOverviewUC()
	ctx := context.Background()

	repo.complexManagers = 5
	repo.activeCustomers = 15
	repo.serviceProviders = 13
	repo.bookings = 30
	repo.complexCompanies = 2
	repo.vendorCompanies = 4
	repo.vendorBookingBreakdown = dashboard.VendorBookingStatusBreakdown{
		Pending: 3, Accepted: 5, Active: 2, Completed: 15, Cancelled: 3, Rejected: 2,
	}
	repo.eventBookingBreakdown = dashboard.EventBookingStatusBreakdown{
		Pending: 2, Accepted: 4, Active: 1, Cancelled: 3, Rejected: 2,
	}
	repo.popularServices = []dashboard.PopularService{
		{ServiceID: 1, ServiceName: "Massage A", BookingCount: 12},
		{ServiceID: 2, ServiceName: "Facial B", BookingCount: 8},
		{ServiceID: 3, ServiceName: "Manicure C", BookingCount: 5},
	}
	repo.mostBookedVendors = []dashboard.MostBookedVendor{
		{VendorID: 10, VendorName: "Alice S.", CompanyID: ptrUint64(100), CompanyName: ptrString("Vendor A"), BookingCount: 15},
		{VendorID: 11, VendorName: "Bob T.", CompanyID: ptrUint64(101), CompanyName: ptrString("Vendor B"), BookingCount: 10},
	}
	repo.upcomingEvents = []dashboard.UpcomingEvent{
		{EventID: 1, Title: "Yoga Morning", StartAt: time.Now().UTC().Add(24 * time.Hour), Responses: 12},
		{EventID: 2, Title: "Pool Party", StartAt: time.Now().UTC().Add(48 * time.Hour), Responses: 8},
	}
	repo.topLocations = []dashboard.TopLocation{
		{Label: "Jersey City, NJ", BookingCount: 18},
		{Label: "Hoboken, NJ", BookingCount: 7},
	}

	overview, err := uc.GetOverview(ctx, dashboard.OverviewScope{Now: time.Now().UTC()})
	require.NoError(t, err)

	assert.Equal(t, int64(5), overview.KPIs.TotalComplexManagers)
	assert.Equal(t, int64(15), overview.KPIs.ActiveCustomers)
	assert.Equal(t, int64(13), overview.KPIs.TotalServiceProviders)
	assert.Equal(t, int64(30), overview.KPIs.TotalBookings)
	assert.Equal(t, int64(2), overview.KPIs.TotalComplexCompanies)
	assert.Equal(t, int64(4), overview.KPIs.TotalVendorCompanies)

	var vendorSum int64
	vendorSum += overview.VendorBookingStats.Pending
	vendorSum += overview.VendorBookingStats.Accepted
	vendorSum += overview.VendorBookingStats.Active
	vendorSum += overview.VendorBookingStats.Completed
	vendorSum += overview.VendorBookingStats.Cancelled
	vendorSum += overview.VendorBookingStats.Rejected
	assert.Equal(t, overview.KPIs.TotalBookings, vendorSum)

	var eventSum int64
	eventSum += overview.EventBookingStats.Pending
	eventSum += overview.EventBookingStats.Accepted
	eventSum += overview.EventBookingStats.Active
	eventSum += overview.EventBookingStats.Cancelled
	eventSum += overview.EventBookingStats.Rejected
	assert.GreaterOrEqual(t, eventSum, int64(0))

	assert.Len(t, overview.PopularServices, 3)
	assert.Equal(t, "Massage A", overview.PopularServices[0].ServiceName)
	assert.Equal(t, int64(12), overview.PopularServices[0].BookingCount)

	assert.Len(t, overview.MostBookedVendors, 2)
	assert.Equal(t, "Alice S.", overview.MostBookedVendors[0].VendorName)

	assert.Len(t, overview.UpcomingEvents, 2)
	assert.True(t, overview.UpcomingEvents[0].StartAt.Before(overview.UpcomingEvents[1].StartAt))

	assert.Len(t, overview.TopLocations, 2)
	assert.Equal(t, "Jersey City, NJ", overview.TopLocations[0].Label)
	assert.True(t, overview.TopLocations[0].BookingCount >= overview.TopLocations[1].BookingCount)
}

func TestDashboardOverview_CompanyScoped(t *testing.T) {
	uc, repo := setupOverviewUC()
	ctx := context.Background()

	repo.complexManagers = 5
	repo.activeCustomers = 15
	repo.serviceProviders = 12
	repo.bookings = 30
	repo.complexCompanies = 2
	repo.vendorCompanies = 4

	companyID := uint64(1)
	overview, err := uc.GetOverview(ctx, dashboard.OverviewScope{
		CompanyID: &companyID,
		Now:       time.Now().UTC(),
	})
	require.NoError(t, err)

	assert.Equal(t, int64(1), overview.KPIs.TotalComplexCompanies)
	assert.Equal(t, int64(1), overview.KPIs.TotalComplexManagers)
	assert.Equal(t, int64(5), overview.KPIs.ActiveCustomers)
	assert.Equal(t, int64(3), overview.KPIs.TotalServiceProviders)
	assert.Equal(t, int64(15), overview.KPIs.TotalBookings)
	assert.Equal(t, int64(1), overview.KPIs.TotalVendorCompanies)
}

func TestDashboardOverview_VendorBookingStatusBreakdownSumsToTotal(t *testing.T) {
	uc, repo := setupOverviewUC()
	ctx := context.Background()

	repo.bookings = 100
	repo.vendorBookingBreakdown = dashboard.VendorBookingStatusBreakdown{
		Pending: 10, Accepted: 30, Active: 5, Completed: 45, Cancelled: 8, Rejected: 2,
	}

	overview, err := uc.GetOverview(ctx, dashboard.OverviewScope{Now: time.Now().UTC()})
	require.NoError(t, err)

	assert.Equal(t, int64(100), overview.KPIs.TotalBookings)
	var sum int64
	sum += overview.VendorBookingStats.Pending
	sum += overview.VendorBookingStats.Accepted
	sum += overview.VendorBookingStats.Active
	sum += overview.VendorBookingStats.Completed
	sum += overview.VendorBookingStats.Cancelled
	sum += overview.VendorBookingStats.Rejected
	assert.Equal(t, overview.KPIs.TotalBookings, sum)
}

func TestDashboardOverview_PopularServicesOrdering(t *testing.T) {
	uc, repo := setupOverviewUC()
	ctx := context.Background()

	repo.popularServices = []dashboard.PopularService{
		{ServiceID: 1, ServiceName: "Alpha", BookingCount: 10},
		{ServiceID: 2, ServiceName: "Beta", BookingCount: 10},
		{ServiceID: 3, ServiceName: "Gamma", BookingCount: 5},
	}

	overview, err := uc.GetOverview(ctx, dashboard.OverviewScope{Now: time.Now().UTC()})
	require.NoError(t, err)

	require.Len(t, overview.PopularServices, 3)
	assert.Equal(t, "Alpha", overview.PopularServices[0].ServiceName)
	assert.Equal(t, int64(10), overview.PopularServices[0].BookingCount)
	assert.Equal(t, "Beta", overview.PopularServices[1].ServiceName)
	assert.Equal(t, int64(10), overview.PopularServices[1].BookingCount)
	assert.Equal(t, "Gamma", overview.PopularServices[2].ServiceName)
	assert.Equal(t, int64(5), overview.PopularServices[2].BookingCount)
}

func TestDashboardOverview_EmptyDB(t *testing.T) {
	uc, _ := setupOverviewUC()
	ctx := context.Background()

	overview, err := uc.GetOverview(ctx, dashboard.OverviewScope{Now: time.Now().UTC()})
	require.NoError(t, err)

	assert.Equal(t, int64(0), overview.KPIs.TotalComplexManagers)
	assert.Equal(t, int64(0), overview.KPIs.ActiveCustomers)
	assert.Equal(t, int64(0), overview.KPIs.TotalServiceProviders)
	assert.Equal(t, int64(0), overview.KPIs.TotalBookings)
	assert.Equal(t, int64(0), overview.KPIs.TotalComplexCompanies)
	assert.Equal(t, int64(0), overview.KPIs.TotalVendorCompanies)
	assert.NotNil(t, overview.PopularServices)
	assert.Empty(t, overview.PopularServices)
	assert.NotNil(t, overview.MostBookedVendors)
	assert.Empty(t, overview.MostBookedVendors)
	assert.NotNil(t, overview.UpcomingEvents)
	assert.Empty(t, overview.UpcomingEvents)
	assert.NotNil(t, overview.TopLocations)
	assert.Empty(t, overview.TopLocations)
}

func TestDashboardOverview_ContextCancellation(t *testing.T) {
	uc, repo := setupOverviewUC()
	repo.delay = 100 * time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		time.Sleep(10 * time.Millisecond)
		cancel()
	}()

	start := time.Now()
	_, err := uc.GetOverview(ctx, dashboard.OverviewScope{Now: time.Now().UTC()})
	elapsed := time.Since(start)

	require.Error(t, err)
	assert.True(t, elapsed < 50*time.Millisecond, "expected cancellation within 50ms, took %v", elapsed)
}

func TestDashboardHandler_ComplexManagerWithoutCompanyID_403(t *testing.T) {
	gin.SetMode(gin.TestMode)
	uc, _ := setupOverviewUC()
	handler := handlers.NewAdminDashboardHandler(uc)

	jwtService := auth.NewService(auth.Config{
		Secret:       "test-secret-that-is-32-bytes-long!!",
		AccessExpiry: 15 * time.Minute,
		Issuer:       "test",
	})
	claims := auth.Claims{
		UserID:   1,
		UserType: "user",
		Roles:    []string{string(auth.RoleComplexManager)},
		RoleAssignments: []auth.RoleAssignment{
			{Role: string(auth.RoleComplexManager), CompanyID: nil},
		},
	}
	tokenPair, err := jwtService.GenerateTokenPair(claims)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/admin/dashboard/overview", nil)
	req.Header.Set("Authorization", "Bearer "+tokenPair.AccessToken)

	r := gin.New()
	r.Use(middleware.RequireAuth(jwtService))
	r.Use(middleware.RequireRole(string(auth.RoleComplexManager)))
	r.GET("/api/admin/dashboard/overview", handler.Overview)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func ptrUint64(v uint64) *uint64 {
	return &v
}

func ptrString(v string) *string {
	return &v
}
