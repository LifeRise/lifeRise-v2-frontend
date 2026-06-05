package dashboard

import (
	"context"
	"runtime"

	"golang.org/x/sync/errgroup"
	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/dashboard"
)

// OverviewUseCase orchestrates dashboard overview aggregations.
type OverviewUseCase struct {
	db   *gorm.DB
	repo dashboard.Repository
}

// NewOverviewUseCase creates a new OverviewUseCase.
func NewOverviewUseCase(db *gorm.DB, repo dashboard.Repository) *OverviewUseCase {
	return &OverviewUseCase{db: db, repo: repo}
}

// GetOverview returns every KPI and list required for the admin dashboard.
//
// The eleven aggregations run concurrently via errgroup.Group with a semaphore
// capped at runtime.GOMAXPROCS(0) to avoid connection pool exhaustion.
func (uc *OverviewUseCase) GetOverview(ctx context.Context, scope dashboard.OverviewScope) (dashboard.DashboardOverview, error) {
	var result dashboard.DashboardOverview
	result.GeneratedAt = scope.Now

	// Initialize slices so JSON never serialises nil.
	result.PopularServices = make([]dashboard.PopularService, 0)
	result.MostBookedVendors = make([]dashboard.MostBookedVendor, 0)
	result.UpcomingEvents = make([]dashboard.UpcomingEvent, 0)
	result.TopLocations = make([]dashboard.TopLocation, 0)

	g, ctx := errgroup.WithContext(ctx)
	sem := make(chan struct{}, runtime.GOMAXPROCS(0))

	// 1. Total complex managers
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		count, err := uc.repo.CountComplexManagers(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.KPIs.TotalComplexManagers = count
		return nil
	})

	// 2. Active customers
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		count, err := uc.repo.CountActiveCustomers(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.KPIs.ActiveCustomers = count
		return nil
	})

	// 3. Total service providers
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		count, err := uc.repo.CountServiceProviders(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.KPIs.TotalServiceProviders = count
		return nil
	})

	// 4. Total bookings
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		count, err := uc.repo.CountBookings(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.KPIs.TotalBookings = count
		return nil
	})

	// 5. Total complex companies
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		count, err := uc.repo.CountComplexCompanies(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.KPIs.TotalComplexCompanies = count
		return nil
	})

	// 6. Total vendor companies
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		count, err := uc.repo.CountVendorCompanies(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.KPIs.TotalVendorCompanies = count
		return nil
	})

	// 7. Vendor booking status breakdown
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		breakdown, err := uc.repo.VendorBookingStatusBreakdown(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.VendorBookingStats = breakdown
		return nil
	})

	// 8. Event booking status breakdown
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		breakdown, err := uc.repo.EventBookingStatusBreakdown(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.EventBookingStats = breakdown
		return nil
	})

	// 9. Popular services
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		services, err := uc.repo.PopularServices(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.PopularServices = services
		return nil
	})

	// 10. Most booked vendors
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		vendors, err := uc.repo.MostBookedVendors(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.MostBookedVendors = vendors
		return nil
	})

	// 11. Upcoming events + top locations (same table affinity, single goroutine)
	g.Go(func() error {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return ctx.Err()
		}
		events, err := uc.repo.UpcomingEvents(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.UpcomingEvents = events

		locations, err := uc.repo.TopLocations(ctx, uc.db, &scope)
		if err != nil {
			return err
		}
		result.TopLocations = locations
		return nil
	})

	if err := g.Wait(); err != nil {
		return dashboard.DashboardOverview{}, err
	}

	return result, nil
}
