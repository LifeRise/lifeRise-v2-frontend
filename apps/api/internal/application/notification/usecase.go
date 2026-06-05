package notification

import (
	"context"
	"fmt"

	"github.com/hibiken/asynq"

	"github.com/liferise/backend/internal/adapters/queue/tasks"
)

// FCMClient abstracts Firebase Cloud Messaging operations.
type FCMClient interface {
	SendToDevice(ctx context.Context, token string, title, body string, data map[string]string) error
	SendToDevices(ctx context.Context, tokens []string, title, body string, data map[string]string) error
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

// UseCase handles notification dispatch.
type UseCase struct {
	asynqClient QueueClient
	fcm         FCMClient
	email       EmailClient
}

// NewUseCase creates a new notification UseCase.
func NewUseCase(asynqClient QueueClient, fcm FCMClient, email EmailClient) *UseCase {
	return &UseCase{
		asynqClient: asynqClient,
		fcm:         fcm,
		email:       email,
	}
}

// SendPushNotification enqueues an FCM push notification.
func (uc *UseCase) SendPushNotification(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
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

// SendEmail enqueues an email delivery task.
func (uc *UseCase) SendEmail(ctx context.Context, to, subject, template string, data map[string]string) error {
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
func (uc *UseCase) SendBookingConfirmation(ctx context.Context, customerEmail string, deviceTokens []string, bookingID uint64) error {
	if customerEmail != "" {
		if err := uc.SendEmail(ctx, customerEmail, "Booking Confirmed", "booking_confirmed", map[string]string{
			"booking_id": fmt.Sprintf("%d", bookingID),
		}); err != nil {
			return err
		}
	}
	if len(deviceTokens) > 0 {
		if err := uc.SendPushNotification(ctx, deviceTokens, "Booking Confirmed", "Your booking has been confirmed.", map[string]string{
			"type":       "booking_confirmed",
			"booking_id": fmt.Sprintf("%d", bookingID),
		}); err != nil {
			return err
		}
	}
	return nil
}

// SendBookingReminder enqueues a reminder for an upcoming booking.
func (uc *UseCase) SendBookingReminder(ctx context.Context, customerEmail string, deviceTokens []string, bookingID uint64, bookingTime string) error {
	task, err := tasks.NewBookingReminderTask(tasks.BookingReminderPayload{
		BookingID:    bookingID,
		CustomerID:   0, // filled by caller
		ReminderType: "upcoming",
	}, asynq.ProcessIn(0)) // immediate; scheduling handled by caller
	if err != nil {
		return fmt.Errorf("create reminder task: %w", err)
	}
	_, err = uc.asynqClient.Enqueue(task, asynq.Queue("low"))
	return err
}
