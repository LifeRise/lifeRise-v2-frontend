package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	appfavorite "github.com/liferise/backend/internal/application/favorite"
	"github.com/liferise/backend/internal/domain/favorite"
	"github.com/liferise/backend/pkg/response"
	"github.com/liferise/backend/pkg/validation"
)

// FavoriteHandler handles customer favorite endpoints.
type FavoriteHandler struct {
	uc *appfavorite.UseCase
}

// NewFavoriteHandler creates a new FavoriteHandler.
func NewFavoriteHandler(uc *appfavorite.UseCase) *FavoriteHandler {
	return &FavoriteHandler{uc: uc}
}

// ToggleRequest mirrors Laravel's favorite toggle validation.
type ToggleRequest struct {
	ServiceID  *uint64 `json:"service_id,omitempty"`
	ProviderID *uint64 `json:"provider_id,omitempty"`
}

// Toggle adds or removes a favorite atomically.
func (h *FavoriteHandler) Toggle(c *gin.Context) {
	var req ToggleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, validation.ValidationErrorsToMap(err))
		return
	}

	if req.ServiceID == nil && req.ProviderID == nil {
		response.ValidationError(c, map[string][]string{
			"service_id":  {"Either service_id or provider_id is required."},
			"provider_id": {"Either service_id or provider_id is required."},
		})
		return
	}

	customerIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}
	customerID := customerIDVal.(uint64)

	isFavorite, err := h.uc.ToggleFavorite(c.Request.Context(), customerID, req.ServiceID, req.ProviderID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Favorite toggled successfully.", gin.H{
		"is_favorite": isFavorite,
	})
}

// List returns the authenticated customer's favorites.
func (h *FavoriteHandler) List(c *gin.Context) {
	customerIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}
	customerID := customerIDVal.(uint64)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "15"))
	favTypeStr := c.Query("type") // "service" | "provider"

	var favType favorite.FavoriteType
	switch favTypeStr {
	case "service":
		favType = favorite.FavoriteTypeService
	case "provider":
		favType = favorite.FavoriteTypeProvider
	}

	favorites, total, err := h.uc.ListFavorites(c.Request.Context(), customerID, favType, page, perPage)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to retrieve favorites.", nil)
		return
	}

	lastPage := int(total) / perPage
	if int(total)%perPage > 0 {
		lastPage++
	}
	if lastPage < 1 {
		lastPage = 1
	}

	response.Success(c, http.StatusOK, "Favorites retrieved.", gin.H{
		"data": favorites,
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
			"to":           (page-1)*perPage + len(favorites),
			"total":        total,
		},
	})
}

// Delete removes a specific favorite.
func (h *FavoriteHandler) Delete(c *gin.Context) {
	customerIDVal, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Unauthorized.", nil)
		return
	}
	customerID := customerIDVal.(uint64)

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		response.ValidationErrorSingle(c, "id", "The id must be a valid integer.")
		return
	}

	if err := h.uc.RemoveFavorite(c.Request.Context(), customerID, id); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error(), nil)
		return
	}

	response.Success(c, http.StatusOK, "Favorite removed successfully.", nil)
}
