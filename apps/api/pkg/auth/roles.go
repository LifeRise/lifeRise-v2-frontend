package auth

// RoleSlug typed constants for the 8 distinct system roles.
type RoleSlug string

const (
	RoleSuperAdmin      RoleSlug = "admin"
	RoleSales           RoleSlug = "sales"
	RolePMO             RoleSlug = "pmo"
	RoleComplexManager  RoleSlug = "complex_manager"
	RoleCompanyStaff    RoleSlug = "company_staff"
	RoleServiceProvider RoleSlug = "service_provider"
	RoleCustomer        RoleSlug = "customer"
	RoleAPIConsumer     RoleSlug = "api_consumer"
)

func (r RoleSlug) String() string { return string(r) }

// IsCompanyScoped returns true if the role requires company-scoped permissions.
func (r RoleSlug) IsCompanyScoped() bool {
	switch r {
	case RoleComplexManager, RoleCompanyStaff, RoleServiceProvider:
		return true
	}
	return false
}

// IsGlobal returns true if the role is global (not company-scoped).
func (r RoleSlug) IsGlobal() bool {
	switch r {
	case RoleSuperAdmin, RoleSales, RolePMO:
		return true
	}
	return false
}
