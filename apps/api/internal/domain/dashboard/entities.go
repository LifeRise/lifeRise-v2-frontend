package dashboard

import "time"

// OverviewScope filters the dashboard overview aggregations.
type OverviewScope struct {
	CompanyID *uint64
	// Now is the reference time for "today / this week" boundaries.
	// It is injected by the use-case so tests can control the clock.
	Now time.Time
}

// DashboardOverview is the response payload for GET /api/admin/dashboard/overview.
type DashboardOverview struct {
	KPIs               KPISet                       `json:"kpis"`
	VendorBookingStats VendorBookingStatusBreakdown `json:"vendor_booking_stats"`
	EventBookingStats  EventBookingStatusBreakdown  `json:"event_booking_stats"`
	PopularServices    []PopularService             `json:"popular_services"`
	MostBookedVendors  []MostBookedVendor           `json:"most_booked_vendors"`
	UpcomingEvents     []UpcomingEvent              `json:"upcoming_events"`
	TopLocations       []TopLocation                `json:"top_locations"`
	GeneratedAt        time.Time                    `json:"generated_at"`
}

// KPISet holds the six primary admin dashboard KPIs.
type KPISet struct {
	TotalComplexManagers  int64 `json:"total_complex_managers"`
	ActiveCustomers       int64 `json:"active_customers"`
	TotalServiceProviders int64 `json:"total_service_providers"`
	TotalBookings         int64 `json:"total_bookings"`
	TotalComplexCompanies int64 `json:"total_complex_companies"`
	TotalVendorCompanies  int64 `json:"total_vendor_companies"`
}

// VendorBookingStatusBreakdown holds named count fields for vendor booking statuses.
type VendorBookingStatusBreakdown struct {
	Pending   int64 `json:"pending"`
	Accepted  int64 `json:"accepted"`
	Active    int64 `json:"active"`
	Completed int64 `json:"completed"`
	Cancelled int64 `json:"cancelled"`
	Rejected  int64 `json:"rejected"`
}

// EventBookingStatusBreakdown holds named count fields for event booking statuses.
type EventBookingStatusBreakdown struct {
	Pending   int64 `json:"pending"`
	Accepted  int64 `json:"accepted"`
	Active    int64 `json:"active"`
	Cancelled int64 `json:"cancelled"`
	Rejected  int64 `json:"rejected"`
}

// PopularService is a service ranked by booking frequency.
type PopularService struct {
	ServiceID    uint64 `json:"service_id"`
	ServiceName  string `json:"service_name"`
	BookingCount int64  `json:"booking_count"`
}

// MostBookedVendor is a vendor ranked by booking frequency.
type MostBookedVendor struct {
	VendorID     uint64  `json:"vendor_id"`
	VendorName   string  `json:"vendor_name"`
	CompanyID    *uint64 `json:"company_id"`
	CompanyName  *string `json:"company_name"`
	BookingCount int64   `json:"booking_count"`
}

// UpcomingEvent is a future group event with response count.
type UpcomingEvent struct {
	EventID   uint64    `json:"event_id"`
	Title     string    `json:"title"`
	StartAt   time.Time `json:"start_at"`
	Location  *string   `json:"location"`
	Responses int64     `json:"responses"`
}

// TopLocation is a geographic label ranked by booking count.
type TopLocation struct {
	Label        string `json:"label"`
	BookingCount int64  `json:"booking_count"`
}
