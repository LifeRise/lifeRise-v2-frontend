package integration

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	appuser "github.com/liferise/backend/internal/application/user"
	"github.com/liferise/backend/internal/domain/customer"
	"github.com/liferise/backend/internal/domain/user"
	"github.com/liferise/backend/pkg/auth"
)

// ── Fake Repositories ──────────────────────────────────────────

type fakeCustomerRepo struct {
	mu         sync.RWMutex
	customers  map[uint64]*customer.Customer
	byEmail    map[string]*customer.Customer
	byPhone    map[string]*customer.Customer
	nextID     uint64
}

func newFakeCustomerRepo() *fakeCustomerRepo {
	return &fakeCustomerRepo{
		customers: make(map[uint64]*customer.Customer),
		byEmail:   make(map[string]*customer.Customer),
		byPhone:   make(map[string]*customer.Customer),
		nextID:    1,
	}
}

func (r *fakeCustomerRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*customer.Customer, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.customers[id]
	if !ok {
		return nil, assert.AnError
	}
	return c, nil
}

func (r *fakeCustomerRepo) GetByEmail(_ context.Context, _ *gorm.DB, email string) (*customer.Customer, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.byEmail[email]
	if !ok {
		return nil, assert.AnError
	}
	return c, nil
}

func (r *fakeCustomerRepo) GetByPhone(_ context.Context, _ *gorm.DB, phone string) (*customer.Customer, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	c, ok := r.byPhone[phone]
	if !ok {
		return nil, assert.AnError
	}
	return c, nil
}

func (r *fakeCustomerRepo) Create(_ context.Context, _ *gorm.DB, c *customer.Customer) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	c.ID = r.nextID
	r.nextID++
	r.customers[c.ID] = c
	r.byEmail[c.Email] = c
	r.byPhone[c.Phone] = c
	return nil
}

func (r *fakeCustomerRepo) Update(_ context.Context, _ *gorm.DB, c *customer.Customer) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.customers[c.ID] = c
	return nil
}

func (r *fakeCustomerRepo) Delete(_ context.Context, _ *gorm.DB, id uint64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.customers, id)
	return nil
}

type fakeUserRepo struct {
	mu          sync.RWMutex
	users       map[uint64]*user.User
	byEmail     map[string]*user.User
	roles       map[string]*user.Role
	permissions map[uint64][]user.Permission
	assignments map[uint64][]user.UserRoleAssignment
	nextID      uint64
}

func newFakeUserRepo() *fakeUserRepo {
	return &fakeUserRepo{
		users:       make(map[uint64]*user.User),
		byEmail:     make(map[string]*user.User),
		roles:       make(map[string]*user.Role),
		permissions: make(map[uint64][]user.Permission),
		assignments: make(map[uint64][]user.UserRoleAssignment),
		nextID:      1,
	}
}

func (r *fakeUserRepo) GetByID(_ context.Context, _ *gorm.DB, id uint64) (*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.users[id]
	if !ok {
		return nil, assert.AnError
	}
	return u, nil
}

func (r *fakeUserRepo) GetByEmail(_ context.Context, _ *gorm.DB, email string) (*user.User, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	u, ok := r.byEmail[email]
	if !ok {
		return nil, assert.AnError
	}
	return u, nil
}

func (r *fakeUserRepo) GetByPhone(_ context.Context, _ *gorm.DB, phone string) (*user.User, error) {
	return nil, assert.AnError
}

func (r *fakeUserRepo) Create(_ context.Context, _ *gorm.DB, u *user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	u.ID = r.nextID
	r.nextID++
	r.users[u.ID] = u
	r.byEmail[u.Email] = u
	return nil
}

func (r *fakeUserRepo) Update(_ context.Context, _ *gorm.DB, u *user.User) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users[u.ID] = u
	return nil
}

func (r *fakeUserRepo) Delete(_ context.Context, _ *gorm.DB, id uint64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.users, id)
	return nil
}

func (r *fakeUserRepo) GetRoleBySlug(_ context.Context, _ *gorm.DB, slug string) (*user.Role, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	role, ok := r.roles[slug]
	if !ok {
		return nil, assert.AnError
	}
	return role, nil
}

func (r *fakeUserRepo) GetPermissionsByRoleID(_ context.Context, _ *gorm.DB, roleID uint64) ([]user.Permission, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.permissions[roleID], nil
}

func (r *fakeUserRepo) GetUserRoleAssignments(_ context.Context, _ *gorm.DB, userID uint64) ([]user.UserRoleAssignment, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.assignments[userID], nil
}

func (r *fakeUserRepo) CreateRoleAssignment(_ context.Context, _ *gorm.DB, a *user.UserRoleAssignment) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.assignments[a.UserID] = append(r.assignments[a.UserID], *a)
	return nil
}

func (r *fakeUserRepo) CreatePasswordReset(_ context.Context, _ *gorm.DB, _ *user.PasswordReset) error {
	return nil
}

func (r *fakeUserRepo) GetPasswordResetByToken(_ context.Context, _ *gorm.DB, _ string) (*user.PasswordReset, error) {
	return nil, assert.AnError
}

func (r *fakeUserRepo) DeletePasswordResetsByEmail(_ context.Context, _ *gorm.DB, _ string) error {
	return nil
}

func setupAuthUC(t *testing.T) (*appuser.AuthUseCase, *fakeCustomerRepo, *fakeUserRepo) {
	jwtService := auth.NewService(auth.Config{
		Secret:       "test-secret-that-is-32-bytes-long!!",
		AccessExpiry: 15 * time.Minute,
		Issuer:       "test",
	})
	custRepo := newFakeCustomerRepo()
	usrRepo := newFakeUserRepo()
	uc := appuser.NewAuthUseCase(nil, usrRepo, custRepo, jwtService, nil)
	return uc, custRepo, usrRepo
}

// ── Tests ──────────────────────────────────────────────────────

func TestAuthUseCase_RegisterCustomer(t *testing.T) {
	uc, _, _ := setupAuthUC(t)
	ctx := context.Background()

	req := appuser.RegisterCustomerRequest{
		FirstName: "John",
		LastName:  "Doe",
		Email:     "john@example.com",
		Phone:     "+1234567890",
		Password:  "securepassword123",
		Timezone:  "America/New_York",
	}

	c, err := uc.RegisterCustomer(ctx, req)
	require.NoError(t, err)
	assert.NotZero(t, c.ID)
	assert.Equal(t, "john@example.com", c.Email)
	assert.Equal(t, "America/New_York", c.Timezone)
	assert.NotEmpty(t, c.PasswordHash)
	assert.True(t, auth.VerifyPassword("securepassword123", c.PasswordHash))

	// Duplicate email should fail
	_, err = uc.RegisterCustomer(ctx, req)
	assert.Error(t, err)
}

func TestAuthUseCase_LoginCustomer(t *testing.T) {
	uc, _, _ := setupAuthUC(t)
	ctx := context.Background()

	// Register first
	_, err := uc.RegisterCustomer(ctx, appuser.RegisterCustomerRequest{
		FirstName: "Jane",
		LastName:  "Doe",
		Email:     "jane@example.com",
		Phone:     "+0987654321",
		Password:  "mypassword456",
	})
	require.NoError(t, err)

	// Valid login
	pair, customer, err := uc.LoginCustomer(ctx, appuser.LoginCustomerRequest{
		Email:    "jane@example.com",
		Password: "mypassword456",
	})
	require.NoError(t, err)
	assert.NotNil(t, pair)
	assert.NotEmpty(t, pair.AccessToken)
	assert.NotEmpty(t, pair.RefreshToken)
	assert.Equal(t, "Bearer", pair.TokenType)
	assert.Equal(t, "jane@example.com", customer.Email)

	// Invalid password
	_, _, err = uc.LoginCustomer(ctx, appuser.LoginCustomerRequest{
		Email:    "jane@example.com",
		Password: "wrongpassword",
	})
	assert.Error(t, err)

	// Non-existent user
	_, _, err = uc.LoginCustomer(ctx, appuser.LoginCustomerRequest{
		Email:    "nobody@example.com",
		Password: "anypassword",
	})
	assert.Error(t, err)
}

func TestAuthUseCase_LoginUser_WithRBAC(t *testing.T) {
	uc, _, usrRepo := setupAuthUC(t)
	ctx := context.Background()

	// Seed role
	adminRole := &user.Role{ID: 1, Name: "Super Admin", Slug: "admin", Level: 100}
	usrRepo.roles["admin"] = adminRole

	perm := user.Permission{ID: 1, Name: "View Dashboard", Slug: "dashboard.view", Module: "dashboard"}
	usrRepo.permissions[1] = []user.Permission{perm}

	// Create user with password
	hash, err := auth.HashPassword("adminpass")
	require.NoError(t, err)

	u := &user.User{
		ID:           1,
		FirstName:    "Admin",
		LastName:     "User",
		Email:        "admin@liferise.com",
		PasswordHash: hash,
		RoleID:       &adminRole.ID,
		Status:       "active",
	}
	usrRepo.users[u.ID] = u
	usrRepo.byEmail[u.Email] = u

	// Assign role
	usrRepo.assignments[u.ID] = []user.UserRoleAssignment{
		{ID: 1, UserID: u.ID, RoleID: adminRole.ID, Role: adminRole},
	}

	// Login
	pair, loggedInUser, err := uc.LoginUser(ctx, appuser.LoginUserRequest{
		Email:    "admin@liferise.com",
		Password: "adminpass",
	})
	require.NoError(t, err)
	assert.NotNil(t, pair)
	assert.Equal(t, "admin@liferise.com", loggedInUser.Email)

	// Verify JWT claims include RBAC
	jwtService := auth.NewService(auth.Config{
		Secret:       "test-secret-that-is-32-bytes-long!!",
		AccessExpiry: 15 * time.Minute,
		Issuer:       "test",
	})
	parsed, err := jwtService.ValidateToken(pair.AccessToken)
	require.NoError(t, err)
	assert.Contains(t, parsed.Roles, "admin")
	assert.Contains(t, parsed.Permissions, "dashboard.view")
}
