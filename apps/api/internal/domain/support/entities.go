package support

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// TicketStatus represents the lifecycle of a support ticket.
type TicketStatus string

const (
	TicketStatusOpen       TicketStatus = "open"
	TicketStatusInProgress TicketStatus = "in_progress"
	TicketStatusResolved   TicketStatus = "resolved"
	TicketStatusClosed     TicketStatus = "closed"
)

// Valid returns true for known statuses.
func (s TicketStatus) Valid() bool {
	switch s {
	case TicketStatusOpen, TicketStatusInProgress, TicketStatusResolved, TicketStatusClosed:
		return true
	}
	return false
}

// TicketPriority represents the urgency of a support ticket.
type TicketPriority string

const (
	TicketPriorityLow    TicketPriority = "low"
	TicketPriorityNormal TicketPriority = "normal"
	TicketPriorityHigh   TicketPriority = "high"
	TicketPriorityUrgent TicketPriority = "urgent"
)

// Valid returns true for known priorities.
func (p TicketPriority) Valid() bool {
	switch p {
	case TicketPriorityLow, TicketPriorityNormal, TicketPriorityHigh, TicketPriorityUrgent:
		return true
	}
	return false
}

// Ticket represents a customer support request.
type Ticket struct {
	ID              uint64         `gorm:"column:id;primaryKey"`
	Subject         string         `gorm:"column:subject;size:255;not null"`
	Body            string         `gorm:"column:body;type:text;not null"`
	Status          string         `gorm:"column:status;size:20;not null;index"`
	Priority        string         `gorm:"column:priority;size:20;not null"`
	Category        *string        `gorm:"column:category;size:50"`
	RequesterUserID *uint64        `gorm:"column:requester_user_id;index"`
	RequesterEmail  *string        `gorm:"column:requester_email;size:255;index"`
	AssigneeUserID  *uint64        `gorm:"column:assignee_user_id;index"`
	CompanyID       *uint64        `gorm:"column:company_id;index"`
	CreatedAt       time.Time      `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt       time.Time      `gorm:"column:updated_at;autoUpdateTime"`
	ResolvedAt      *time.Time     `gorm:"column:resolved_at"`
	DeletedAt       gorm.DeletedAt `gorm:"column:deleted_at;index"`

	Messages []Message `gorm:"foreignKey:ticket_id"`
}

func (Ticket) TableName() string { return "support_tickets" }

// Message represents a reply on a support ticket.
type Message struct {
	ID           uint64    `gorm:"column:id;primaryKey"`
	TicketID     uint64    `gorm:"column:ticket_id;not null;index"`
	AuthorUserID *uint64   `gorm:"column:author_user_id"`
	Body         string    `gorm:"column:body;type:text;not null"`
	CreatedAt    time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (Message) TableName() string { return "support_messages" }

// Repository defines persistence operations for support tickets.
type Repository interface {
	List(ctx context.Context, db *gorm.DB, filters ListFilters) ([]Ticket, int64, error)
	GetByID(ctx context.Context, db *gorm.DB, id uint64) (*Ticket, error)
	Create(ctx context.Context, db *gorm.DB, ticket *Ticket) error
	Update(ctx context.Context, db *gorm.DB, ticket *Ticket) error
	Delete(ctx context.Context, db *gorm.DB, id uint64) error
	CreateMessage(ctx context.Context, db *gorm.DB, message *Message) error
}

// ListFilters defines query parameters for listing support tickets.
type ListFilters struct {
	Status     string
	Priority   string
	AssigneeID *uint64
	CompanyID  *uint64
	Search     string
	Page       int
	PerPage    int
}
