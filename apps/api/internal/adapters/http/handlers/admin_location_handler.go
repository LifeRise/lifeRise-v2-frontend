package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	appaudit "github.com/liferise/backend/internal/application/audit"
	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/internal/domain/location"
	"github.com/liferise/backend/internal/infrastructure/pagination"
	"github.com/liferise/backend/internal/infrastructure/persistence"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// AdminLocationHandler handles admin location CRUD.
type AdminLocationHandler struct {
	db           *gorm.DB
	locationRepo *persistence.LocationRepo
	auditLogger  *appaudit.Logger
}

// NewAdminLocationHandler creates a new AdminLocationHandler.
func NewAdminLocationHandler(db *gorm.DB, locationRepo *persistence.LocationRepo, auditLogger *appaudit.Logger) *AdminLocationHandler {
	return &AdminLocationHandler{db: db, locationRepo: locationRepo, auditLogger: auditLogger}
}

// AdminCreateLocationRequest defines the body for creating a location.
type AdminCreateLocationRequest struct {
	Name     string   `json:"name" validate:"required"`
	Type     string   `json:"type" validate:"required,oneof=region city neighborhood"`
	ParentID *uint64  `json:"parent_id"`
	Lat      *float64 `json:"lat"`
	Lng      *float64 `json:"lng"`
}

// AdminUpdateLocationRequest defines the body for updating a location.
type AdminUpdateLocationRequest struct {
	Name     *string  `json:"name"`
	Type     *string  `json:"type" validate:"omitempty,oneof=region city neighborhood"`
	ParentID *uint64  `json:"parent_id"`
	Lat      *float64 `json:"lat"`
	Lng      *float64 `json:"lng"`
}

// List returns paginated locations.
func (h *AdminLocationHandler) List(c *gin.Context) {
	p := pagination.Parse(c)
	locationType := c.Query("type")
	var parentID *uint64
	if pidStr := c.Query("parent_id"); pidStr != "" {
		pid, err := strconv.ParseUint(pidStr, 10, 64)
		if err != nil {
			response.ValidationErrorSingle(c, "parent_id", "The parent_id must be a valid integer.")
			return
		}
		parentID = &pid
	}
	search := c.Query("search")

	locs, total, err := h.locationRepo.ListAdmin(c.Request.Context(), h.db, locationType, parentID, search, p.Page, p.PerPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to load locations.", nil)
		return
	}

	meta := pagination.CalculateMeta(total, p, len(locs))
	links := pagination.BuildLinks(c, p, meta.LastPage)
	adminPaginatedSuccess(c, "Locations retrieved.", locs, meta, links)
}

// Get returns a single location.
func (h *AdminLocationHandler) Get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	loc, err := h.locationRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Location not found.", nil)
		return
	}
	response.Success(c, http.StatusOK, "Location retrieved.", loc)
}

// Create creates a new location.
func (h *AdminLocationHandler) Create(c *gin.Context) {
	var req AdminCreateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	locType := location.LocationType(req.Type)
	if !locType.Valid() {
		response.ValidationErrorSingle(c, "type", "The selected type is invalid.")
		return
	}

	loc := location.Location{
		Name:     req.Name,
		Type:     locType,
		ParentID: req.ParentID,
		Lat:      req.Lat,
		Lng:      req.Lng,
	}

	if err := h.locationRepo.Create(c.Request.Context(), h.db, &loc); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create location.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionCreate, "locations", loc.ID, nil, loc)

	response.Success(c, http.StatusCreated, "Location created.", loc)
}

// Update updates a location.
func (h *AdminLocationHandler) Update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	var req AdminUpdateLocationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	loc, err := h.locationRepo.GetByID(c.Request.Context(), h.db, id)
	if err != nil {
		response.Error(c, http.StatusNotFound, "Location not found.", nil)
		return
	}

	old := *loc
	if req.Name != nil {
		loc.Name = *req.Name
	}
	if req.Type != nil {
		locType := location.LocationType(*req.Type)
		if !locType.Valid() {
			response.ValidationErrorSingle(c, "type", "The selected type is invalid.")
			return
		}
		loc.Type = locType
	}
	if req.ParentID != nil {
		loc.ParentID = req.ParentID
	}
	if req.Lat != nil {
		loc.Lat = req.Lat
	}
	if req.Lng != nil {
		loc.Lng = req.Lng
	}

	if err := h.locationRepo.Update(c.Request.Context(), h.db, loc); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update location.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionUpdate, "locations", id, old, loc)

	response.Success(c, http.StatusOK, "Location updated.", loc)
}

// Delete hard-deletes a location.
func (h *AdminLocationHandler) Delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.locationRepo.Delete(c.Request.Context(), h.db, id); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete location.", nil)
		return
	}

	claims := extractClaims(c)
	_ = h.auditLogger.RecordMutation(c.Request.Context(), c.Request, claims, audit.ActionDelete, "locations", id, nil, nil)

	c.Status(http.StatusNoContent)
}
