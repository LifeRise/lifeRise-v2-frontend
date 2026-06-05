package persistence

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/support"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// SupportRepo implements support.Repository with GORM.
type SupportRepo struct{}

// NewSupportRepo creates a new SupportRepo.
func NewSupportRepo() *SupportRepo { return &SupportRepo{} }

// GetByID retrieves a support ticket by ID.
func (r *SupportRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*support.Ticket, error) {
	var t support.Ticket
	if err := db.WithContext(ctx).Preload("Messages").First(&t, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &t, nil
}

// List retrieves support tickets with filters and pagination.
func (r *SupportRepo) List(ctx context.Context, db *gorm.DB, filters support.ListFilters) ([]support.Ticket, int64, error) {
	query := db.WithContext(ctx).Model(&support.Ticket{}).Where("deleted_at IS NULL")
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.Priority != "" {
		query = query.Where("priority = ?", filters.Priority)
	}
	if filters.AssigneeID != nil {
		query = query.Where("assignee_user_id = ?", *filters.AssigneeID)
	}
	if filters.CompanyID != nil {
		query = query.Where("company_id = ?", *filters.CompanyID)
	}
	if filters.Search != "" {
		query = query.Where("subject ILIKE ? OR body ILIKE ? OR requester_email ILIKE ?", "%"+filters.Search+"%", "%"+filters.Search+"%", "%"+filters.Search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	page := filters.Page
	perPage := filters.PerPage
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 15
	}
	if perPage > 100 {
		perPage = 100
	}

	offset := (page - 1) * perPage
	var results []support.Ticket
	if err := query.Order("created_at DESC").Limit(perPage).Offset(offset).Find(&results).Error; err != nil {
		return nil, 0, err
	}
	return results, total, nil
}

// Create persists a new support ticket.
func (r *SupportRepo) Create(ctx context.Context, db *gorm.DB, ticket *support.Ticket) error {
	return db.WithContext(ctx).Create(ticket).Error
}

// Update persists changes to a support ticket.
func (r *SupportRepo) Update(ctx context.Context, db *gorm.DB, ticket *support.Ticket) error {
	return db.WithContext(ctx).Save(ticket).Error
}

// Delete soft-deletes a support ticket.
func (r *SupportRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&support.Ticket{}, id).Error
}

// CreateMessage persists a new message on a support ticket.
func (r *SupportRepo) CreateMessage(ctx context.Context, db *gorm.DB, message *support.Message) error {
	return db.WithContext(ctx).Create(message).Error
}
