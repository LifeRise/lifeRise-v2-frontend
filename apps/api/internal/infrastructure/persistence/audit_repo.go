package persistence

import (
	"context"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/audit"
)

// AuditRepo implements audit.Repository with GORM.
type AuditRepo struct{}

// NewAuditRepo creates a new AuditRepo.
func NewAuditRepo() *AuditRepo { return &AuditRepo{} }

// Create persists an audit log entry.
func (r *AuditRepo) Create(ctx context.Context, db *gorm.DB, entry *audit.LogEntry) error {
	return db.WithContext(ctx).Create(entry).Error
}

// List returns audit logs with filtering and pagination.
func (r *AuditRepo) List(ctx context.Context, db *gorm.DB, filters audit.ListFilters) ([]audit.LogEntry, int64, error) {
	var entries []audit.LogEntry
	var total int64

	query := db.WithContext(ctx).Model(&audit.LogEntry{})
	if filters.ActorUserID != nil {
		query = query.Where("actor_user_id = ?", *filters.ActorUserID)
	}
	if filters.CompanyID != nil {
		query = query.Where("company_id = ?", *filters.CompanyID)
	}
	if filters.Action != "" {
		query = query.Where("action = ?", filters.Action)
	}
	if filters.EntityType != "" {
		query = query.Where("entity_type = ?", filters.EntityType)
	}
	if filters.EntityID != nil {
		query = query.Where("entity_id = ?", *filters.EntityID)
	}
	if filters.DateFrom != nil {
		query = query.Where("created_at >= ?", *filters.DateFrom)
	}
	if filters.DateTo != nil {
		query = query.Where("created_at <= ?", *filters.DateTo)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := filters.Page
	if page < 1 {
		page = 1
	}
	perPage := filters.PerPage
	if perPage < 1 {
		perPage = 25
	}

	offset := (page - 1) * perPage
	err := query.Order("created_at DESC").Limit(perPage).Offset(offset).Find(&entries).Error
	return entries, total, err
}
