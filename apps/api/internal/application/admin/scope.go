package admin

import (
	"github.com/liferise/backend/pkg/auth"
)

// Scope holds the resolved company scope for an admin request.
type Scope struct {
	CompanyID        *uint64
	IsGlobal         bool
	IsComplexManager bool
}

// ResolveScope determines the data scope from JWT claims.
func ResolveScope(claims *auth.Claims) Scope {
	if claims == nil {
		return Scope{}
	}
	s := Scope{}
	for _, r := range claims.Roles {
		switch r {
		case string(auth.RoleSuperAdmin), string(auth.RoleSales), string(auth.RolePMO):
			s.IsGlobal = true
		case string(auth.RoleComplexManager):
			s.IsComplexManager = true
		}
	}
	if s.IsComplexManager && !s.IsGlobal {
		for _, a := range claims.RoleAssignments {
			if a.Role == string(auth.RoleComplexManager) && a.CompanyID != nil {
				s.CompanyID = a.CompanyID
				break
			}
		}
	}
	return s
}

// CanAccessCompany returns true if the scope allows access to the given company.
func (s Scope) CanAccessCompany(companyID uint64) bool {
	if s.IsGlobal {
		return true
	}
	if s.CompanyID != nil && *s.CompanyID == companyID {
		return true
	}
	return false
}
