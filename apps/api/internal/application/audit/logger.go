package audit

import (
	"context"
	"encoding/json"
	"net/http"

	"gorm.io/gorm"

	"github.com/liferise/backend/internal/domain/audit"
	"github.com/liferise/backend/pkg/auth"
)

// Logger records audit log entries.
type Logger struct {
	db   *gorm.DB
	repo audit.Repository
}

// NewLogger creates a new audit Logger.
func NewLogger(db *gorm.DB, repo audit.Repository) *Logger {
	return &Logger{db: db, repo: repo}
}

// Record persists an audit log entry.
func (l *Logger) Record(ctx context.Context, entry audit.LogEntry) error {
	return l.repo.Create(ctx, l.db, &entry)
}

// RecordWithRequest enriches the entry with HTTP request metadata and persists it.
func (l *Logger) RecordWithRequest(ctx context.Context, r *http.Request, entry audit.LogEntry) error {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.RemoteAddr
	}
	entry.IP = &ip
	ua := r.UserAgent()
	entry.UserAgent = &ua
	return l.Record(ctx, entry)
}

// RecordMutation is a helper for create/update/delete actions.
func (l *Logger) RecordMutation(ctx context.Context, r *http.Request, claims *auth.Claims, action audit.Action, entityType string, entityID uint64, oldData, newData interface{}) error {
	var diffStr *string
	if oldData != nil || newData != nil {
		diff := map[string]interface{}{}
		if oldData != nil {
			diff["old"] = oldData
		}
		if newData != nil {
			diff["new"] = newData
		}
		b, _ := json.Marshal(diff)
		s := string(b)
		diffStr = &s
	}

	var actorUserID *uint64
	var companyID *uint64
	var actorRole string
	if claims != nil {
		actorUserID = &claims.UserID
		actorRole = claims.UserType
		for _, a := range claims.RoleAssignments {
			if a.CompanyID != nil {
				companyID = a.CompanyID
				break
			}
		}
	}

	entry := audit.LogEntry{
		ActorUserID: actorUserID,
		ActorRole:   actorRole,
		CompanyID:   companyID,
		Action:      string(action),
		EntityType:  entityType,
		EntityID:    &entityID,
		Diff:        diffStr,
	}
	return l.RecordWithRequest(ctx, r, entry)
}
