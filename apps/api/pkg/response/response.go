package response

import (
	"github.com/gin-gonic/gin"
)

// APIResponse replicates Laravel's ApiResponse trait JSON shape.
type APIResponse struct {
	Status  bool        `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
}

// Success returns a successful response matching Laravel's success format.
func Success(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(status, APIResponse{
		Status:  true,
		Message: message,
		Data:    data,
	})
}

// Error returns an error response matching Laravel's error format.
func Error(c *gin.Context, status int, message string, errors interface{}) {
	c.JSON(status, APIResponse{
		Status:  false,
		Message: message,
		Errors:  errors,
	})
}

// ValidationError returns a 422 validation error identical to Laravel's Form Request failures.
// Format: {"message": "The given data was invalid.", "errors": {"field": ["error message"]}}
func ValidationError(c *gin.Context, errors map[string][]string) {
	c.JSON(422, APIResponse{
		Status:  false,
		Message: "The given data was invalid.",
		Errors:  errors,
	})
}

// ValidationErrorSingle is a convenience helper for a single field validation failure.
func ValidationErrorSingle(c *gin.Context, field, errMsg string) {
	ValidationError(c, map[string][]string{
		field: {errMsg},
	})
}

// PaginatedData replicates Laravel's pagination wrapper.
type PaginatedData struct {
	Data  interface{}     `json:"data"`
	Links PaginationLinks `json:"links"`
	Meta  PaginationMeta  `json:"meta"`
}

// PaginationLinks replicates Laravel's pagination links.
type PaginationLinks struct {
	First string `json:"first,omitempty"`
	Last  string `json:"last,omitempty"`
	Prev  string `json:"prev,omitempty"`
	Next  string `json:"next,omitempty"`
}

// PaginationMeta replicates Laravel's pagination meta.
type PaginationMeta struct {
	CurrentPage int    `json:"current_page"`
	From        int    `json:"from"`
	LastPage    int    `json:"last_page"`
	Path        string `json:"path"`
	PerPage     int    `json:"per_page"`
	To          int    `json:"to"`
	Total       int    `json:"total"`
}

// PaginatedSuccess returns a paginated response matching Laravel's pagination format.
func PaginatedSuccess(c *gin.Context, status int, message string, data PaginatedData) {
	c.JSON(status, APIResponse{
		Status:  true,
		Message: message,
		Data:    data,
	})
}
