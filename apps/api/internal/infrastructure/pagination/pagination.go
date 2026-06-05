package pagination

import (
	"math"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/liferise/backend/pkg/response"
	"gorm.io/gorm"
)

// Params holds parsed pagination query parameters.
type Params struct {
	Page    int
	PerPage int
	Offset  int
}

// Default returns default pagination params.
func Default() Params {
	return Params{Page: 1, PerPage: 25, Offset: 0}
}

// Parse extracts pagination params from Gin query.
func Parse(c *gin.Context) Params {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage < 1 {
		perPage = 25
	}
	if perPage > 100 {
		perPage = 100
	}
	return Params{Page: page, PerPage: perPage, Offset: (page - 1) * perPage}
}

// Apply adds limit and offset to a GORM query.
func Apply(db *gorm.DB, p Params) *gorm.DB {
	return db.Limit(p.PerPage).Offset(p.Offset)
}

// Meta holds pagination metadata.
type Meta struct {
	CurrentPage int
	LastPage    int
	From        int
	To          int
	Total       int64
	PerPage     int
}

// CalculateMeta computes pagination metadata after a count.
func CalculateMeta(total int64, p Params, retrieved int) Meta {
	lastPage := int(math.Ceil(float64(total) / float64(p.PerPage)))
	from := p.Offset + 1
	to := p.Offset + retrieved
	if to > int(total) {
		to = int(total)
	}
	if total == 0 {
		from = 0
		to = 0
	}
	return Meta{CurrentPage: p.Page, LastPage: lastPage, From: from, To: to, Total: total, PerPage: p.PerPage}
}

// BuildLinks constructs Laravel-style pagination links.
func BuildLinks(c *gin.Context, p Params, lastPage int) response.PaginationLinks {
	path := c.Request.URL.Path
	return response.PaginationLinks{
		First: path + "?page=1&per_page=" + strconv.Itoa(p.PerPage),
		Last:  path + "?page=" + strconv.Itoa(lastPage) + "&per_page=" + strconv.Itoa(p.PerPage),
		Prev:  prevLink(path, p, lastPage),
		Next:  nextLink(path, p, lastPage),
	}
}

func prevLink(path string, p Params, lastPage int) string {
	if p.Page <= 1 || p.Page > lastPage {
		return ""
	}
	return path + "?page=" + strconv.Itoa(p.Page-1) + "&per_page=" + strconv.Itoa(p.PerPage)
}

func nextLink(path string, p Params, lastPage int) string {
	if p.Page >= lastPage || lastPage == 0 {
		return ""
	}
	return path + "?page=" + strconv.Itoa(p.Page+1) + "&per_page=" + strconv.Itoa(p.PerPage)
}
