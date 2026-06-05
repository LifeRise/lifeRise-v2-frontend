package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"

	"github.com/liferise/backend/pkg/auth"
)

func TestRequireAuth(t *testing.T) {
	gin.SetMode(gin.TestMode)

	svc := auth.NewService(auth.Config{
		Secret:       "test-secret-that-is-32-bytes-long!!",
		AccessExpiry: 15 * time.Minute,
		Issuer:       "test",
	})

	claims := auth.Claims{
		UserID:   1,
		UserType: "customer",
		Roles:    []string{"customer"},
	}
	pair, _ := svc.GenerateTokenPair(claims)

	// Success case
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/", nil)
	c.Request.Header.Set("Authorization", "Bearer "+pair.AccessToken)

	handler := RequireAuth(svc)
	handler(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.NotNil(t, ExtractClaims(c))
	assert.Equal(t, uint64(1), ExtractClaims(c).UserID)

	// Missing auth header
	w2 := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(w2)
	c2.Request, _ = http.NewRequest("GET", "/", nil)

	handler(c2)
	assert.Equal(t, http.StatusUnauthorized, w2.Code)

	// Invalid token
	w3 := httptest.NewRecorder()
	c3, _ := gin.CreateTestContext(w3)
	c3.Request, _ = http.NewRequest("GET", "/", nil)
	c3.Request.Header.Set("Authorization", "Bearer invalid-token")

	handler(c3)
	assert.Equal(t, http.StatusUnauthorized, w3.Code)
}

func TestRequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		roles      []string
		required   []string
		expectCode int
	}{
		{"allowed", []string{"admin", "sales"}, []string{"admin"}, http.StatusOK},
		{"forbidden", []string{"customer"}, []string{"admin"}, http.StatusForbidden},
		{"multiple allowed", []string{"company_staff"}, []string{"admin", "company_staff"}, http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Set(ClaimsKey, &auth.Claims{Roles: tt.roles})

			handler := RequireRole(tt.required...)
			handler(c)

			assert.Equal(t, tt.expectCode, w.Code)
		})
	}
}

func TestRequireCompanyScopedRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	companyA := uint64(10)
	companyB := uint64(20)

	tests := []struct {
		name       string
		assignments []auth.RoleAssignment
		pathCompany string
		allowed    []string
		expectCode int
	}{
		{
			"global role accesses any company",
			[]auth.RoleAssignment{{Role: "admin", CompanyID: nil}},
			"10",
			[]string{"admin"},
			http.StatusOK,
		},
		{
			"scoped role matches company",
			[]auth.RoleAssignment{{Role: "company_staff", CompanyID: &companyA}},
			"10",
			[]string{"company_staff"},
			http.StatusOK,
		},
		{
			"scoped role wrong company",
			[]auth.RoleAssignment{{Role: "company_staff", CompanyID: &companyA}},
			"20",
			[]string{"company_staff"},
			http.StatusForbidden,
		},
		{
			"multi-company user correct scope",
			[]auth.RoleAssignment{
				{Role: "company_staff", CompanyID: &companyA},
				{Role: "service_provider", CompanyID: &companyB},
			},
			"20",
			[]string{"service_provider"},
			http.StatusOK,
		},
		{
			"no company in path with scoped role",
			[]auth.RoleAssignment{{Role: "company_staff", CompanyID: &companyA}},
			"",
			[]string{"company_staff"},
			http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request, _ = http.NewRequest("GET", "/", nil)
			if tt.pathCompany != "" {
				c.Params = gin.Params{{Key: "company_id", Value: tt.pathCompany}}
			}
			c.Set(ClaimsKey, &auth.Claims{RoleAssignments: tt.assignments})

			handler := RequireCompanyScopedRole(tt.allowed...)
			handler(c)

			assert.Equal(t, tt.expectCode, w.Code)
		})
	}
}
