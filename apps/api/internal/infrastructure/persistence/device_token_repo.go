package persistence

import (
	"context"

	domain "github.com/liferise/backend/internal/domain/user"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// DeviceTokenRepo is a GORM implementation of user.DeviceTokenRepository.
type DeviceTokenRepo struct{}

// NewDeviceTokenRepo creates a new device token repository.
func NewDeviceTokenRepo() *DeviceTokenRepo { return &DeviceTokenRepo{} }

func (r *DeviceTokenRepo) Upsert(ctx context.Context, db interface{}, userID uint64, token, platform string) error {
	gdb := db.(*gorm.DB).WithContext(ctx)
	record := domain.DeviceToken{UserID: userID, Token: token, Platform: platform}
	return gdb.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "token"}},
		DoUpdates: clause.AssignmentColumns([]string{"user_id", "platform", "updated_at"}),
	}).Create(&record).Error
}

func (r *DeviceTokenRepo) GetByUser(ctx context.Context, db interface{}, userID uint64) ([]string, error) {
	gdb := db.(*gorm.DB).WithContext(ctx)
	var tokens []domain.DeviceToken
	if err := gdb.Where("user_id = ?", userID).Find(&tokens).Error; err != nil {
		return nil, err
	}
	result := make([]string, len(tokens))
	for i, t := range tokens {
		result[i] = t.Token
	}
	return result, nil
}

func (r *DeviceTokenRepo) Delete(ctx context.Context, db interface{}, token string) error {
	return db.(*gorm.DB).WithContext(ctx).
		Where("token = ?", token).Delete(&domain.DeviceToken{}).Error
}
