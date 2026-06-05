package audit

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Action represents the type of audited action.
type Action string

const (
	ActionCreate  Action = "create"
	ActionUpdate  Action = "update"
	ActionDelete  Action = "delete"
	ActionApprove Action = "approve"
	ActionReject  Action = "reject"
	ActionExport  Action = "export"
)

// Valid returns true for known actions.
func (a Action) Valid() bool {
	switch a {
	case ActionCreate, ActionUpdate, ActionDelete, ActionApprove, ActionReject, ActionExport:
		return true
	}
	return false
}

// LogEntry represents a single audit log record.
type LogEntry struct {
	ID          uint64    `gorm:"column:id;primaryKey"`
	ActorUserID *uint64   `gorm:"column:actor_user_id;index"`
	ActorRole   string    `gorm:"column:actor_role;size:50;not null"`
	CompanyID   *uint64   `gorm:"column:company_id;index"`
	Action      string    `gorm:"column:action;size:50;not null"`
	EntityType  string    `gorm:"column:entity_type;size:100;not null"`
	EntityID    *uint64   `gorm:"column:entity_id"`
	Diff        *string   `gorm:"column:diff;type:jsonb"`
	IP          *string   `gorm:"column:ip;size:45"`
	UserAgent   *string   `gorm:"column:user_agent;size:500"`
	CreatedAt   time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (LogEntry) TableName() string { return "audit_logs" }

// Repository defines persistence operations for audit logs.
type Repository interface {
	Create(ctx context.Context, db *gorm.DB, entry *LogEntry) error
	List(ctx context.Context, db *gorm.DB, filters ListFilters) ([]LogEntry, int64, error)
}

// ListFilters defines query parameters for listing audit logs.
type ListFilters struct {
	ActorUserID *uint64
	CompanyID   *uint64
	Action      string
	EntityType  string
	EntityID    *uint64
	DateFrom    *time.Time
	DateTo      *time.Time
	Page        int
	PerPage     int
}
