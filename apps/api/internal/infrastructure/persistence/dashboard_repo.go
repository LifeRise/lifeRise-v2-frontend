package persistence

import (
	"context"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/booking"
	"github.com/liferise/backend/internal/domain/company"
	"github.com/liferise/backend/internal/domain/customer"
	"github.com/liferise/backend/internal/domain/dashboard"
	"github.com/liferise/backend/internal/domain/user"
)

// DashboardRepo implements dashboard.Repository with GORM.
type DashboardRepo struct{}

// NewDashboardRepo creates a new DashboardRepo.
func NewDashboardRepo() *DashboardRepo { return &DashboardRepo{} }

// CountComplexManagers returns the number of distinct users with the complex_manager role.
func (r *DashboardRepo) CountComplexManagers(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	var count int64
	query := db.WithContext(ctx).
		Model(&user.User{}).
		Select("COUNT(DISTINCT users.id)").
		Joins("JOIN user_role_assignments ON user_role_assignments.user_id = users.id").
		Joins("JOIN roles ON roles.id = user_role_assignments.role_id").
		Where("users.deleted_at IS NULL").
		Where("roles.slug = ?", "complex_manager")

	if scope.CompanyID != nil {
		query = query.Where("user_role_assignments.company_id = ?", *scope.CompanyID)
	}

	err := query.Scan(&count).Error
	return count, err
}

// CountActiveCustomers returns the number of active customers.
// Active means: deleted_at IS NULL, status = 'active', and last_login_at
// is within the last 30 days relative to scope.Now.
// When scoped, only customers with at least one booking in the complex are counted.
func (r *DashboardRepo) CountActiveCustomers(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	threshold := scope.Now.AddDate(0, 0, -30)

	var count int64
	query := db.WithContext(ctx).
		Model(&customer.Customer{}).
		Where("customers.deleted_at IS NULL").
		Where("customers.status = ?", "active").
		Where("customers.last_login_at > ?", threshold)

	if scope.CompanyID != nil {
		query = query.Where(
			"EXISTS (SELECT 1 FROM bookings WHERE bookings.customer_id = customers.id AND bookings.company_id = ? AND bookings.deleted_at IS NULL)",
			*scope.CompanyID,
		)
	}

	err := query.Count(&count).Error
	return count, err
}

// CountServiceProviders returns the number of distinct users with the service_provider role.
// Scoped variant: providers linked to the complex via company_users OR via at least one booking in the complex.
func (r *DashboardRepo) CountServiceProviders(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	var count int64
	query := db.WithContext(ctx).
		Model(&user.User{}).
		Select("COUNT(DISTINCT users.id)").
		Joins("JOIN user_role_assignments ON user_role_assignments.user_id = users.id").
		Joins("JOIN roles ON roles.id = user_role_assignments.role_id").
		Where("users.deleted_at IS NULL").
		Where("roles.slug = ?", "service_provider")

	if scope.CompanyID != nil {
		query = query.Where(
			"EXISTS (SELECT 1 FROM company_users WHERE company_users.user_id = users.id AND company_users.company_id = ?) OR EXISTS (SELECT 1 FROM bookings WHERE bookings.service_provider_id = users.id AND bookings.company_id = ? AND bookings.deleted_at IS NULL)",
			*scope.CompanyID, *scope.CompanyID,
		)
	}

	err := query.Scan(&count).Error
	return count, err
}

// CountBookings returns the total number of bookings.
func (r *DashboardRepo) CountBookings(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	query := db.WithContext(ctx).Model(&booking.Booking{}).Where("bookings.deleted_at IS NULL")
	if scope.CompanyID != nil {
		query = query.Where("bookings.company_id = ?", *scope.CompanyID)
	}
	var count int64
	err := query.Count(&count).Error
	return count, err
}

// CountComplexCompanies returns the number of complex companies.
// When scoped to a single company, the result is either 0 or 1.
func (r *DashboardRepo) CountComplexCompanies(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	query := db.WithContext(ctx).
		Model(&company.Company{}).
		Where("companies.deleted_at IS NULL").
		Where("companies.type = ?", company.CompanyTypeComplex)

	if scope.CompanyID != nil {
		query = query.Where("companies.id = ?", *scope.CompanyID)
	}

	var count int64
	err := query.Count(&count).Error
	return count, err
}

// CountVendorCompanies returns the number of vendor companies.
// When scoped, only vendors with at least one service booked in the specified complex are counted.
func (r *DashboardRepo) CountVendorCompanies(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (int64, error) {
	if scope.CompanyID != nil {
		var count int64
		err := db.WithContext(ctx).
			Model(&company.Company{}).
			Select("COUNT(DISTINCT companies.id)").
			Joins("JOIN services ON services.company_id = companies.id AND services.deleted_at IS NULL").
			Joins("JOIN bookings ON bookings.service_id = services.id AND bookings.deleted_at IS NULL").
			Where("companies.type = ?", company.CompanyTypeVendor).
			Where("companies.deleted_at IS NULL").
			Where("bookings.company_id = ?", *scope.CompanyID).
			Scan(&count).Error
		return count, err
	}

	var count int64
	err := db.WithContext(ctx).
		Model(&company.Company{}).
		Where("companies.deleted_at IS NULL").
		Where("companies.type = ?", company.CompanyTypeVendor).
		Count(&count).Error
	return count, err
}

// VendorBookingStatusBreakdown returns vendor booking counts mapped to named status fields.
func (r *DashboardRepo) VendorBookingStatusBreakdown(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (dashboard.VendorBookingStatusBreakdown, error) {
	var results []struct {
		Status string
		Count  int64
	}

	query := db.WithContext(ctx).
		Model(&booking.Booking{}).
		Select("status, COUNT(*) as count").
		Where("bookings.deleted_at IS NULL").
		Group("status")

	if scope.CompanyID != nil {
		query = query.Where("bookings.company_id = ?", *scope.CompanyID)
	}

	if err := query.Scan(&results).Error; err != nil {
		return dashboard.VendorBookingStatusBreakdown{}, err
	}

	var b dashboard.VendorBookingStatusBreakdown
	for _, r := range results {
		switch r.Status {
		case "Pending":
			b.Pending = r.Count
		case "Confirmed":
			b.Accepted = r.Count
		case "Current":
			b.Active = r.Count
		case "Completed":
			b.Completed = r.Count
		case "Cancelled":
			b.Cancelled = r.Count
		case "Rejected":
			b.Rejected = r.Count
		}
	}
	return b, nil
}

// EventBookingStatusBreakdown returns event booking counts mapped to named status fields.
func (r *DashboardRepo) EventBookingStatusBreakdown(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) (dashboard.EventBookingStatusBreakdown, error) {
	var results []struct {
		Status string
		Count  int64
	}

	query := db.WithContext(ctx).
		Table("event_bookings").
		Select("status, COUNT(*) as count").
		Where("event_bookings.deleted_at IS NULL").
		Group("status")

	if scope.CompanyID != nil {
		query = query.Where(
			"EXISTS (SELECT 1 FROM group_events WHERE group_events.id = event_bookings.event_id AND group_events.company_id = ? AND group_events.deleted_at IS NULL)",
			*scope.CompanyID,
		)
	}

	if err := query.Scan(&results).Error; err != nil {
		return dashboard.EventBookingStatusBreakdown{}, err
	}

	var b dashboard.EventBookingStatusBreakdown
	for _, r := range results {
		switch r.Status {
		case "pending":
			b.Pending = r.Count
		case "accepted":
			b.Accepted = r.Count
		case "active":
			b.Active = r.Count
		case "cancelled":
			b.Cancelled = r.Count
		case "rejected":
			b.Rejected = r.Count
		}
		// "completed" is intentionally unmapped per spec.
	}
	return b, nil
}

// PopularServices returns the top-10 services by booking count.
// Ties are broken by service name ascending.
func (r *DashboardRepo) PopularServices(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) ([]dashboard.PopularService, error) {
	results := make([]dashboard.PopularService, 0)

	query := db.WithContext(ctx).
		Model(&booking.Booking{}).
		Select("services.id as service_id, services.name as service_name, COUNT(bookings.id) as booking_count").
		Joins("JOIN services ON services.id = bookings.service_id AND services.deleted_at IS NULL").
		Where("bookings.deleted_at IS NULL").
		Group("services.id, services.name").
		Order("booking_count DESC, services.name ASC").
		Limit(10)

	if scope.CompanyID != nil {
		query = query.Where("bookings.company_id = ?", *scope.CompanyID)
	}

	err := query.Scan(&results).Error
	return results, err
}

// MostBookedVendors returns the top-10 vendors by booking count.
// Ties are broken by vendor name ascending.
func (r *DashboardRepo) MostBookedVendors(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) ([]dashboard.MostBookedVendor, error) {
	results := make([]dashboard.MostBookedVendor, 0)

	query := db.WithContext(ctx).
		Model(&booking.Booking{}).
		Select(`
			users.id as vendor_id,
			CONCAT(users.first_name, ' ', users.last_name) as vendor_name,
			companies.id as company_id,
			companies.name as company_name,
			COUNT(bookings.id) as booking_count
		`).
		Joins("JOIN services ON services.id = bookings.service_id AND services.deleted_at IS NULL").
		Joins("JOIN users ON users.id = services.provider_id AND users.deleted_at IS NULL").
		Joins("LEFT JOIN companies ON companies.id = services.company_id AND companies.deleted_at IS NULL").
		Where("bookings.deleted_at IS NULL").
		Group("users.id, users.first_name, users.last_name, companies.id, companies.name").
		Order("booking_count DESC, vendor_name ASC").
		Limit(10)

	if scope.CompanyID != nil {
		query = query.Where("bookings.company_id = ?", *scope.CompanyID)
	}

	err := query.Scan(&results).Error
	return results, err
}

// UpcomingEvents returns future scheduled group events with response counts.
func (r *DashboardRepo) UpcomingEvents(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) ([]dashboard.UpcomingEvent, error) {
	results := make([]dashboard.UpcomingEvent, 0)

	query := db.WithContext(ctx).
		Table("group_events").
		Select(`
			group_events.id as event_id,
			group_events.title,
			group_events.start_at,
			group_events.location,
			COUNT(event_responses.id) as responses
		`).
		Joins("LEFT JOIN event_responses ON event_responses.event_id = group_events.id").
		Where("group_events.start_at > ?", scope.Now).
		Where("group_events.status = ?", "scheduled").
		Where("group_events.deleted_at IS NULL").
		Group("group_events.id, group_events.title, group_events.start_at, group_events.location").
		Order("group_events.start_at ASC").
		Limit(10)

	if scope.CompanyID != nil {
		query = query.Where("group_events.company_id = ?", *scope.CompanyID)
	}

	err := query.Scan(&results).Error
	return results, err
}

// TopLocations returns the top-10 city,state labels by booking count.
func (r *DashboardRepo) TopLocations(ctx context.Context, db *gorm.DB, scope *dashboard.OverviewScope) ([]dashboard.TopLocation, error) {
	results := make([]dashboard.TopLocation, 0)

	query := db.WithContext(ctx).
		Model(&booking.Booking{}).
		Select("CONCAT(bookings.location->>'city', ', ', bookings.location->>'state') as label, COUNT(*) as booking_count").
		Where("bookings.deleted_at IS NULL").
		Where("bookings.location->>'city' IS NOT NULL").
		Where("bookings.location->>'state' IS NOT NULL").
		Group("label").
		Order("booking_count DESC").
		Limit(10)

	if scope.CompanyID != nil {
		query = query.Where("bookings.company_id = ?", *scope.CompanyID)
	}

	err := query.Scan(&results).Error
	return results, err
}
