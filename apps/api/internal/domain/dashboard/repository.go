package dashboard

import (
	"context"

	"gorm.io/gorm"
)

// Repository defines persistence for dashboard aggregations.
type Repository interface {
	CountComplexManagers(ctx context.Context, db *gorm.DB, scope *OverviewScope) (int64, error)
	CountActiveCustomers(ctx context.Context, db *gorm.DB, scope *OverviewScope) (int64, error)
	CountServiceProviders(ctx context.Context, db *gorm.DB, scope *OverviewScope) (int64, error)
	CountBookings(ctx context.Context, db *gorm.DB, scope *OverviewScope) (int64, error)
	CountComplexCompanies(ctx context.Context, db *gorm.DB, scope *OverviewScope) (int64, error)
	CountVendorCompanies(ctx context.Context, db *gorm.DB, scope *OverviewScope) (int64, error)

	VendorBookingStatusBreakdown(ctx context.Context, db *gorm.DB, scope *OverviewScope) (VendorBookingStatusBreakdown, error)
	EventBookingStatusBreakdown(ctx context.Context, db *gorm.DB, scope *OverviewScope) (EventBookingStatusBreakdown, error)

	PopularServices(ctx context.Context, db *gorm.DB, scope *OverviewScope) ([]PopularService, error)
	MostBookedVendors(ctx context.Context, db *gorm.DB, scope *OverviewScope) ([]MostBookedVendor, error)
	UpcomingEvents(ctx context.Context, db *gorm.DB, scope *OverviewScope) ([]UpcomingEvent, error)
	TopLocations(ctx context.Context, db *gorm.DB, scope *OverviewScope) ([]TopLocation, error)
}
