package persistence

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/event"
	apperrors "github.com/liferise/backend/pkg/errors"
)

// EventRepo implements event.Repository with GORM.
type EventRepo struct{}

// NewEventRepo creates a new EventRepo.
func NewEventRepo() *EventRepo { return &EventRepo{} }

// ListUpcoming returns upcoming group events.
func (r *EventRepo) ListUpcoming(ctx context.Context, db *gorm.DB, companyID *uint64, after time.Time, limit int) ([]event.GroupEvent, error) {
	var events []event.GroupEvent
	query := db.WithContext(ctx).Model(&event.GroupEvent{}).Where("deleted_at IS NULL AND start_at > ?", after)
	if companyID != nil {
		query = query.Where("company_id = ?", *companyID)
	}
	if err := query.Order("start_at ASC").Limit(limit).Find(&events).Error; err != nil {
		return nil, err
	}
	return events, nil
}

// CountResponsesByEvent counts responses for an event.
func (r *EventRepo) CountResponsesByEvent(ctx context.Context, db *gorm.DB, eventID uint64) (int64, error) {
	var count int64
	err := db.WithContext(ctx).Model(&event.EventResponse{}).Where("event_id = ?", eventID).Count(&count).Error
	return count, err
}

// EventBookingStatusBreakdown returns event booking counts by status.
func (r *EventRepo) EventBookingStatusBreakdown(ctx context.Context, db *gorm.DB, companyID *uint64) (map[string]int64, error) {
	var results []struct {
		Status string
		Count  int64
	}

	query := db.WithContext(ctx).
		Table("event_bookings").
		Select("status, COUNT(*) as count").
		Where("event_bookings.deleted_at IS NULL").
		Group("status")

	if companyID != nil {
		query = query.Where(
			"EXISTS (SELECT 1 FROM group_events WHERE group_events.id = event_bookings.event_id AND group_events.company_id = ? AND group_events.deleted_at IS NULL)",
			*companyID,
		)
	}

	if err := query.Scan(&results).Error; err != nil {
		return nil, err
	}

	breakdown := make(map[string]int64)
	for _, res := range results {
		breakdown[res.Status] = res.Count
	}
	return breakdown, nil
}

// ListAdmin returns paginated group events with filters.
func (r *EventRepo) ListAdmin(ctx context.Context, db *gorm.DB, companyID *uint64, status string, search string, page, perPage int) ([]event.GroupEvent, int64, error) {
	var events []event.GroupEvent
	var total int64

	query := db.WithContext(ctx).Model(&event.GroupEvent{}).Where("deleted_at IS NULL")
	if companyID != nil {
		query = query.Where("company_id = ?", *companyID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if search != "" {
		query = query.Where("title ILIKE ?", "%"+search+"%")
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("start_at DESC").Limit(perPage).Offset(offset).Find(&events).Error; err != nil {
		return nil, 0, err
	}
	return events, total, nil
}

// GetByID retrieves a group event by ID.
func (r *EventRepo) GetByID(ctx context.Context, db *gorm.DB, id uint64) (*event.GroupEvent, error) {
	var e event.GroupEvent
	if err := db.WithContext(ctx).First(&e, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &e, nil
}

// Create persists a new group event.
func (r *EventRepo) Create(ctx context.Context, db *gorm.DB, e *event.GroupEvent) error {
	return db.WithContext(ctx).Create(e).Error
}

// Update persists changes to a group event.
func (r *EventRepo) Update(ctx context.Context, db *gorm.DB, e *event.GroupEvent) error {
	return db.WithContext(ctx).Save(e).Error
}

// Delete soft-deletes a group event.
func (r *EventRepo) Delete(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&event.GroupEvent{}, id).Error
}

// ListEventBookings returns paginated event bookings with filters.
func (r *EventRepo) ListEventBookings(ctx context.Context, db *gorm.DB, eventID *uint64, status string, page, perPage int) ([]event.EventBooking, int64, error) {
	var bookings []event.EventBooking
	var total int64

	query := db.WithContext(ctx).Model(&event.EventBooking{}).Where("deleted_at IS NULL")
	if eventID != nil {
		query = query.Where("event_id = ?", *eventID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("created_at DESC").Limit(perPage).Offset(offset).Find(&bookings).Error; err != nil {
		return nil, 0, err
	}
	return bookings, total, nil
}

// GetEventBookingByID retrieves an event booking by ID.
func (r *EventRepo) GetEventBookingByID(ctx context.Context, db *gorm.DB, id uint64) (*event.EventBooking, error) {
	var b event.EventBooking
	if err := db.WithContext(ctx).First(&b, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &b, nil
}

// CreateEventBooking persists a new event booking.
func (r *EventRepo) CreateEventBooking(ctx context.Context, db *gorm.DB, b *event.EventBooking) error {
	return db.WithContext(ctx).Create(b).Error
}

// UpdateEventBooking persists changes to an event booking.
func (r *EventRepo) UpdateEventBooking(ctx context.Context, db *gorm.DB, b *event.EventBooking) error {
	return db.WithContext(ctx).Save(b).Error
}

// DeleteEventBooking soft-deletes an event booking.
func (r *EventRepo) DeleteEventBooking(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Delete(&event.EventBooking{}, id).Error
}

// ListEventResponses returns paginated event responses with filters.
func (r *EventRepo) ListEventResponses(ctx context.Context, db *gorm.DB, eventID *uint64, response string, page, perPage int) ([]event.EventResponse, int64, error) {
	var responses []event.EventResponse
	var total int64

	query := db.WithContext(ctx).Model(&event.EventResponse{})
	if eventID != nil {
		query = query.Where("event_id = ?", *eventID)
	}
	if response != "" {
		query = query.Where("response = ?", response)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	if err := query.Order("responded_at DESC").Limit(perPage).Offset(offset).Find(&responses).Error; err != nil {
		return nil, 0, err
	}
	return responses, total, nil
}

// GetEventResponseByID retrieves an event response by ID.
func (r *EventRepo) GetEventResponseByID(ctx context.Context, db *gorm.DB, id uint64) (*event.EventResponse, error) {
	var resp event.EventResponse
	if err := db.WithContext(ctx).First(&resp, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperrors.ErrNotFound
		}
		return nil, err
	}
	return &resp, nil
}

// CreateEventResponse persists a new event response.
func (r *EventRepo) CreateEventResponse(ctx context.Context, db *gorm.DB, resp *event.EventResponse) error {
	return db.WithContext(ctx).Create(resp).Error
}

// UpdateEventResponse persists changes to an event response.
func (r *EventRepo) UpdateEventResponse(ctx context.Context, db *gorm.DB, resp *event.EventResponse) error {
	return db.WithContext(ctx).Save(resp).Error
}

// DeleteEventResponse hard-deletes an event response.
func (r *EventRepo) DeleteEventResponse(ctx context.Context, db *gorm.DB, id uint64) error {
	return db.WithContext(ctx).Unscoped().Delete(&event.EventResponse{}, id).Error
}
