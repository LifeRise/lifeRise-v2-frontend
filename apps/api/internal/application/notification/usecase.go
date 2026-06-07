package notification

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"

	"github.com/liferise/backend/internal/adapters/queue/tasks"
	"github.com/liferise/backend/internal/domain/notification"
	"github.com/liferise/backend/internal/domain/user"
)

// FCMClient abstracts Firebase Cloud Messaging operations.
type FCMClient interface {
	SendToDevice(ctx context.Context, token string, title, body string, data map[string]string) error
	// SendToDevices returns failed tokens so callers can prune stale registrations.
	SendToDevices(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]string, error)
}

// EmailClient abstracts email delivery operations.
type EmailClient interface {
	Send(ctx context.Context, to, subject, template string, data map[string]string) error
}

// QueueClient abstracts Asynq task enqueuing for testability.
type QueueClient interface {
	Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error)
	Close() error
}

// UseCase handles notification dispatch and in-app persistence.
type UseCase struct {
	db          *gorm.DB
	repo        notification.Repository
	asynqClient QueueClient
	fcm         FCMClient
	email       EmailClient
	tokenRepo   user.DeviceTokenRepository
}

// NewUseCase creates a new notification UseCase.
func NewUseCase(db *gorm.DB, repo notification.Repository, asynqClient QueueClient, fcm FCMClient, email EmailClient, tokenRepo user.DeviceTokenRepository) *UseCase {
	return &UseCase{
		db:          db,
		repo:        repo,
		asynqClient: asynqClient,
		fcm:         fcm,
		email:       email,
		tokenRepo:   tokenRepo,
	}
}

// persist creates an in-app notification record when the repo and db are configured.
func (uc *UseCase) persist(ctx context.Context, userID uint64, title, body, notifType string) {
	if uc.repo == nil || uc.db == nil {
		return
	}
	n := &notification.Notification{
		UserID: userID,
		Title:  title,
		Body:   body,
		Type:   notifType,
	}
	_ = uc.repo.Create(ctx, uc.db, n)
}

// SendPushNotification enqueues an FCM push notification and persists an in-app record.
func (uc *UseCase) SendPushNotification(ctx context.Context, userID uint64, tokens []string, title, body string, data map[string]string, notifType string) error {
	if len(tokens) == 0 {
		return nil
	}

	uc.persist(ctx, userID, title, body, notifType)

	task, err := tasks.NewFCMNotificationTask(tasks.FCMNotificationPayload{
		Tokens: tokens,
		Title:  title,
		Body:   body,
		Data:   data,
	})
	if err != nil {
		return fmt.Errorf("create fcm task: %w", err)
	}
	_, err = uc.asynqClient.Enqueue(task, asynq.Queue("critical"))
	return err
}

// SendEmail enqueues an email delivery task and persists an in-app record.
func (uc *UseCase) SendEmail(ctx context.Context, userID uint64, to, subject, template string, data map[string]string, notifType string) error {
	uc.persist(ctx, userID, subject, fmt.Sprintf("Email sent to %s", to), notifType)

	task, err := tasks.NewEmailDeliveryTask(tasks.EmailDeliveryPayload{
		To:       to,
		Subject:  subject,
		Template: template,
		Data:     data,
	})
	if err != nil {
		return fmt.Errorf("create email task: %w", err)
	}
	_, err = uc.asynqClient.Enqueue(task, asynq.Queue("default"))
	return err
}

// SendBookingConfirmation dispatches both push and email for a confirmed booking.
func (uc *UseCase) SendBookingConfirmation(ctx context.Context, userID uint64, customerEmail string, deviceTokens []string, bookingID uint64) error {
	if customerEmail != "" {
		if err := uc.SendEmail(ctx, userID, customerEmail, "Booking Confirmed", "booking_confirmed", map[string]string{
			"booking_id": fmt.Sprintf("%d", bookingID),
		}, "booking"); err != nil {
			return err
		}
	}
	if len(deviceTokens) > 0 {
		if err := uc.SendPushNotification(ctx, userID, deviceTokens, "Booking Confirmed", "Your booking has been confirmed.", map[string]string{
			"type":       "booking_confirmed",
			"booking_id": fmt.Sprintf("%d", bookingID),
		}, "booking"); err != nil {
			return err
		}
	}
	return nil
}

// SendBookingReminder enqueues a reminder for an upcoming booking.
func (uc *UseCase) SendBookingReminder(ctx context.Context, userID uint64, customerEmail string, deviceTokens []string, bookingID uint64, bookingTime string) error {
	uc.persist(ctx, userID, "Booking Reminder", fmt.Sprintf("Your booking #%d is coming up at %s.", bookingID, bookingTime), "reminder")

	task, err := tasks.NewBookingReminderTask(tasks.BookingReminderPayload{
		BookingID:    bookingID,
		CustomerID:   userID,
		ReminderType: "upcoming",
	}, asynq.ProcessIn(0)) // immediate; scheduling handled by caller
	if err != nil {
		return fmt.Errorf("create reminder task: %w", err)
	}
	_, err = uc.asynqClient.Enqueue(task, asynq.Queue("low"))
	return err
}

// ListNotifications returns paginated notifications for a user.
func (uc *UseCase) ListNotifications(ctx context.Context, userID uint64, unreadOnly bool, page, perPage int) ([]notification.Notification, int64, error) {
	if uc.repo == nil || uc.db == nil {
		return nil, 0, fmt.Errorf("notification repository not configured")
	}
	return uc.repo.ListByUserID(ctx, uc.db, userID, unreadOnly, page, perPage)
}

// MarkRead marks a single notification as read for a user.
func (uc *UseCase) MarkRead(ctx context.Context, userID, id uint64) error {
	if uc.repo == nil || uc.db == nil {
		return fmt.Errorf("notification repository not configured")
	}
	return uc.repo.MarkRead(ctx, uc.db, userID, id)
}

// MarkAllRead marks all unread notifications as read for a user.
func (uc *UseCase) MarkAllRead(ctx context.Context, userID uint64) error {
	if uc.repo == nil || uc.db == nil {
		return fmt.Errorf("notification repository not configured")
	}
	return uc.repo.MarkAllRead(ctx, uc.db, userID)
}

// RegisterDeviceToken persists an FCM token for a user.
func (uc *UseCase) RegisterDeviceToken(ctx context.Context, userID uint64, token, platform string) error {
	if uc.tokenRepo == nil || uc.db == nil {
		return fmt.Errorf("device token repository not configured")
	}
	return uc.tokenRepo.Upsert(ctx, uc.db, userID, token, platform)
}

// DeleteDeviceToken removes a specific FCM token.
func (uc *UseCase) DeleteDeviceToken(ctx context.Context, token string) error {
	if uc.tokenRepo == nil || uc.db == nil {
		return fmt.Errorf("device token repository not configured")
	}
	return uc.tokenRepo.Delete(ctx, uc.db, token)
}

// GetDeviceTokens returns all active tokens for a user.
func (uc *UseCase) GetDeviceTokens(ctx context.Context, userID uint64) ([]string, error) {
	if uc.tokenRepo == nil || uc.db == nil {
		return nil, fmt.Errorf("device token repository not configured")
	}
	return uc.tokenRepo.GetByUser(ctx, uc.db, userID)
}
