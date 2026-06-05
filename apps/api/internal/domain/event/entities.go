package event

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// GroupEventStatus represents the lifecycle of a group event.
type GroupEventStatus string

const (
	GroupEventStatusScheduled GroupEventStatus = "scheduled"
	GroupEventStatusCancelled GroupEventStatus = "cancelled"
	GroupEventStatusCompleted GroupEventStatus = "completed"
)

// Valid returns true for known statuses.
func (s GroupEventStatus) Valid() bool {
	switch s {
	case GroupEventStatusScheduled, GroupEventStatusCancelled, GroupEventStatusCompleted:
		return true
	}
	return false
}

// ResponseType represents a customer's response to an event invitation.
type ResponseType string

const (
	ResponseGoing    ResponseType = "going"
	ResponseMaybe    ResponseType = "maybe"
	ResponseDeclined ResponseType = "declined"
)

// Valid returns true for known response types.
func (r ResponseType) Valid() bool {
	switch r {
	case ResponseGoing, ResponseMaybe, ResponseDeclined:
		return true
	}
	return false
}

// EventBookingStatus represents the lifecycle of an event booking.
type EventBookingStatus string

const (
	EventBookingStatusPending   EventBookingStatus = "pending"
	EventBookingStatusAccepted  EventBookingStatus = "accepted"
	EventBookingStatusActive    EventBookingStatus = "active"
	EventBookingStatusCancelled EventBookingStatus = "cancelled"
	EventBookingStatusRejected  EventBookingStatus = "rejected"
	EventBookingStatusCompleted EventBookingStatus = "completed"
)

// Valid returns true for known event booking statuses.
func (s EventBookingStatus) Valid() bool {
	switch s {
	case EventBookingStatusPending, EventBookingStatusAccepted, EventBookingStatusActive,
		EventBookingStatusCancelled, EventBookingStatusRejected, EventBookingStatusCompleted:
		return true
	}
	return false
}

// GroupEvent represents a scheduled group activity.
type GroupEvent struct {
	ID          uint64         `gorm:"column:id;primaryKey"`
	CompanyID   uint64         `gorm:"column:company_id;not null;index"`
	Title       string         `gorm:"column:title;size:255;not null"`
	Description *string        `gorm:"column:description;type:text"`
	StartAt     time.Time      `gorm:"column:start_at;not null;index"`
	EndAt       time.Time      `gorm:"column:end_at;not null"`
	Location    datatypes.JSON `gorm:"column:location;type:jsonb"`
	Capacity    *int           `gorm:"column:capacity"`
	Status      string         `gorm:"column:status;size:20;not null;index"`
	CreatedBy   *uint64        `gorm:"column:created_by"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (GroupEvent) TableName() string { return "group_events" }

// EventResponse tracks a customer's RSVP to a group event.
type EventResponse struct {
	ID          uint64    `gorm:"column:id;primaryKey"`
	EventID     uint64    `gorm:"column:event_id;not null;index"`
	CustomerID  uint64    `gorm:"column:customer_id;not null;index"`
	Response    string    `gorm:"column:response;size:20;not null"`
	RespondedAt time.Time `gorm:"column:responded_at;default:CURRENT_TIMESTAMP"`
}

func (EventResponse) TableName() string { return "event_responses" }

// EventBooking tracks a paid/reserved seat for a group event.
type EventBooking struct {
	ID          uint64         `gorm:"column:id;primaryKey"`
	EventID     uint64         `gorm:"column:event_id;not null;index"`
	CustomerID  uint64         `gorm:"column:customer_id;not null;index"`
	Status      string         `gorm:"column:status;size:20;not null;index"`
	BookedAt    time.Time      `gorm:"column:booked_at;default:CURRENT_TIMESTAMP"`
	CancelledAt *time.Time     `gorm:"column:cancelled_at"`
	Notes       *string        `gorm:"column:notes;type:text"`
	CreatedAt   time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	DeletedAt   gorm.DeletedAt `gorm:"column:deleted_at;index"`
}

func (EventBooking) TableName() string { return "event_bookings" }
