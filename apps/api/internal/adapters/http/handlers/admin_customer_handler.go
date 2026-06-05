package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/customer"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminCustomerHandler handles admin customer CRUD.
type AdminCustomerHandler struct {
	db           *gorm.DB
	customerRepo *persistence.CustomerRepo
	auditLogger  *appaudit.Logger
}

// NewAdminCustomerHandler creates a new AdminCustomerHandler.
func NewAdminCustomerHandler(db *gorm.DB, customerRepo *persistence.CustomerRepo, auditLogger *appaudit.Logger) *AdminCustomerHandler {
	return &AdminCustomerHandler{db: db, customerRepo: customerRepo, auditLogger: auditLogger}
}

// CreateCustomerRequest defines the body for creating a customer.
type CreateCustomerRequest struct {
	FirstName string  `json:"first_name" validate:"required"`
	LastName  string  `json:"last_name" validate:"required"`
	Email     string  `json:"email" validate:"required,email"`
	Phone     *string `json:"phone"`
	Status    string  `json:"status" validate:"oneof=active inactive pending"`
}

// UpdateCustomerRequest defines the body for updating a customer.
type UpdateCustomerRequest struct {
	FirstName *string `json:"first_name"`
	LastName  *string `json:"last_name"`
	Email     *string `json:"email" validate:"omitempty,email"`
	Phone     *string `json:"phone"`
	Status    *string `json:"status" validate:"omitempty,oneof=active inactive pending"`
}

// List returns paginated customers.
func (h *AdminCustomerHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	status := c.Query("status")
	search := c.Query("search")

	customers, total, err := h.customerRepo.ListAdmin(c.Request.Context(), h.db, status, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load customers.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(customers))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Customers retrieved.", customers, meta, links)
}

// Get returns a single customer.
func (h *AdminCustomerHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	co, err := h.customerRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Customer not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Customer retrieved.", co)
}

// Create creates a new customer.
func (h *AdminCustomerHandler) Create(c *gin.Context) {
	var req CreateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	co := customer.Customer{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     req.Email,
		Phone:     "",
		Status:    req.Status,
	}
	if req.Phone != nil {
		co.Phone = *req.Phone
	}
	if co.Status == "" {
		co.Status = "active"
	}

	if err := h.customerRepo.Create(c.Request.Context(), h.db, &co); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create customer.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "customers", co.ID, nil, co)

	response.Success(c, http.StatusCreated, "Customer created.", co)
}

// Update updates a customer.
func (h *AdminCustomerHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req UpdateCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	co, err := h.customerRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Customer not found.", nil)
		return
	}

	old := *co
	if req.FirstName != nil {
		co.FirstName = *req.FirstName
	}
	if req.LastName != nil {
		co.LastName = *req.LastName
	}
	if req.Email != nil {
		co.Email = *req.Email
	}
	if req.Phone != nil {
		co.Phone = *req.Phone
	}
	if req.Status != nil {
		co.Status = *req.Status
	}

	if err := h.customerRepo.Update(c.Request.Context(), h.db, co); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update customer.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "customers", id, old, co)

	response.Success(c, http.StatusOK, "Customer updated.", co)
}

// Delete soft-deletes a customer.
func (h *AdminCustomerHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.customerRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete customer.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "customers", id, nil, nil)

	c.Status(http.StatusNoContent)
}
