package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/liferise/backend/internal/adapters/http/middleware"
	appservice "github.com/liferise/backend/internal/application/service"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// ServiceHandler handles service catalog endpoints.
type ServiceHandler struct {
	uc *appservice.UseCase
}

// NewServiceHandler creates a new ServiceHandler.
func NewServiceHandler(uc *appservice.UseCase) *ServiceHandler {
	return &ServiceHandler{uc: uc}
}

// List returns paginated services with optional filters.
func (h *ServiceHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	categorySlug := c.Query("category")
	providerIDStr := c.Query("provider_id")
	search := c.Query("search")
	isFeaturedStr := c.Query("is_featured")

	var providerID *uint64
	if providerIDStr != "" {
		if id, err := strconv.ParseUint(providerIDStr, 10, 64); err == nil {
			providerID = &id
		}
	}

	var isFeatured *bool
	switch isFeaturedStr {
	case "1", "true":
		t := true
		isFeatured = &t
	case "0", "false":
		f := false
		isFeatured = &f
	}

	services, total, err := h.uc.ListServices(c.Request.Context(), appservice.ListServicesRequest{
		CategorySlug: categorySlug,
		ProviderID:   providerID,
		Search:       search,
		IsFeatured:   isFeatured,
		Page:         page,
		PerPage:      perPage,
	})
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to retrieve services.", nil)
		return
	}

	lastPage := int(total) / perPage
	if int(total)%perPage > 0 {
		lastPage++
	}
	if lastPage < 1 {
		lastPage = 1
	}

	response.Success(c, http.StatusOK, "Services retrieved.", gin.H{
		"data": services,
		"links": map[string]interface{}{
			"first": c.Request.URL.Path + "?page=1&per_page=" + strconv.Itoa(perPage),
			"last":  c.Request.URL.Path + "?page=" + strconv.Itoa(lastPage) + "&per_page=" + strconv.Itoa(perPage),
			"prev":  nil,
			"next":  nil,
		},
		"meta": map[string]interface{}{
			"current_page": page,
			"from":         (page-1)*perPage + 1,
			"last_page":    lastPage,
			"path":         c.Request.URL.Path,
			"per_page":     perPage,
			"to":           (page-1)*perPage + len(services),
			"total":        total,
		},
	})
}

// Get returns a single service by ID.
func (h *ServiceHandler) Get(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	svc, err := h.uc.GetService(c.Request.Context(), id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Service not found.", nil)
		return
	}

	response.Success(c, http.StatusOK, "Service retrieved.", gin.H{
		"service": svc,
	})
}

// GetSlots returns available time slots for a service/provider.
func (h *ServiceHandler) GetSlots(c *gin.Context) {
	serviceID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	date := c.Query("date")
	providerIDStr := c.Query("provider_id")

	_ = serviceID
	_ = date
	_ = providerIDStr

	// TODO: implement slot query
	response.Success(c, http.StatusOK, "Available slots retrieved.", gin.H{
		"slots": []interface{}{},
	})
}

// ProviderServiceRequest mirrors Laravel's service store validation.
type ProviderServiceRequest struct {
	Name            string  `json:"name" validate:"required,max=255"`
	Description     *string `json:"description,omitempty"`
	Price           float64 `json:"price" validate:"required,gte=0"`
	Currency        string  `json:"currency,omitempty" validate:"omitempty,len=3"`
	Duration        int     `json:"duration" validate:"required,gte=1"`
	CategoryID      *uint64 `json:"category_id,omitempty"`
	MaxParticipants int     `json:"max_participants,omitempty" validate:"omitempty,gte=1"`
	LocationType    string  `json:"location_type,omitempty"`
}

// Create handles new service creation (provider/admin).
func (h *ServiceHandler) Create(c *gin.Context) {
	var req ProviderServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	providerID, _ := c.Get(middleware.UserIDKey)

	svc, err := h.uc.CreateService(c.Request.Context(), appservice.CreateServiceRequest{
		ProviderID:      providerID.(uint64),
		Name:            req.Name,
		Description:     req.Description,
		Price:           req.Price,
		Currency:        req.Currency,
		Duration:        req.Duration,
		CategoryID:      req.CategoryID,
		MaxParticipants: req.MaxParticipants,
		LocationType:    req.LocationType,
	})
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusCreated, "Service created successfully.", gin.H{
		"service": svc,
	})
}

// Update handles service updates.
func (h *ServiceHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	var req ProviderServiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	svc, err := h.uc.UpdateService(c.Request.Context(), id, appservice.CreateServiceRequest{
		Name:            req.Name,
		Description:     req.Description,
		Price:           req.Price,
		Currency:        req.Currency,
		Duration:        req.Duration,
		CategoryID:      req.CategoryID,
		MaxParticipants: req.MaxParticipants,
		LocationType:    req.LocationType,
	})
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Service updated successfully.", gin.H{
		"service": svc,
	})
}

// Delete soft-deletes a service.
func (h *ServiceHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	if err := h.uc.DeleteService(c.Request.Context(), id); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Service deleted successfully.", nil)
}
