package user

import "context"

// DeviceTokenRepository defines persistence operations for FCM tokens.
type DeviceTokenRepository interface {
	// Upsert inserts a new token or updates the updated_at timestamp if it already exists.
	Upsert(ctx context.Context, db interface{}, userID uint64, token, platform string) error
	// GetByUser returns all active tokens for a user.
	GetByUser(ctx context.Context, db interface{}, userID uint64) ([]string, error)
	// Delete removes a specific token (e.g. when FCM reports it as invalid).
	Delete(ctx context.Context, db interface{}, token string) error
}
