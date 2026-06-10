package tasks

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/hibiken/asynq"
)

// Task type constants.
const (
	TypeEmailDelivery     = "email:deliver"
	TypeFCMNotification   = "fcm:notify"
	TypeBookingReminder   = "booking:reminder"
	TypeAnnouncementEmail = "announcement:email"
)

// EmailDeliveryPayload is the payload for email tasks.
type EmailDeliveryPayload struct {
	To       string            `json:"to"`
	Subject  string            `json:"subject"`
	Template string            `json:"template"`
	Data     map[string]string `json:"data"`
}

// FCMNotificationPayload is the payload for FCM push tasks.
type FCMNotificationPayload struct {
	Tokens []string          `json:"tokens"`
	Title  string            `json:"title"`
	Body   string            `json:"body"`
	Data   map[string]string `json:"data"`
}

// BookingReminderPayload is the payload for booking reminder tasks.
type BookingReminderPayload struct {
	BookingID    uint64 `json:"booking_id"`
	CustomerID   uint64 `json:"customer_id"`
	ReminderType string `json:"reminder_type"` // "upcoming", "follow_up"
}

// AnnouncementEmailPayload is the payload for announcement email tasks.
type AnnouncementEmailPayload struct {
	AnnouncementID uint64 `json:"announcement_id"`
	Audience       string `json:"audience"`
}

// NewEmailDeliveryTask creates an Asynq task for email delivery.
func NewEmailDeliveryTask(payload EmailDeliveryPayload, opts ...asynq.Option) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal email payload: %w", err)
	}
	return asynq.NewTask(TypeEmailDelivery, data, opts...), nil
}

// NewFCMNotificationTask creates an Asynq task for FCM push.
func NewFCMNotificationTask(payload FCMNotificationPayload, opts ...asynq.Option) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal fcm payload: %w", err)
	}
	return asynq.NewTask(TypeFCMNotification, data, opts...), nil
}

// NewBookingReminderTask creates an Asynq task for booking reminders.
func NewBookingReminderTask(payload BookingReminderPayload, opts ...asynq.Option) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal reminder payload: %w", err)
	}
	return asynq.NewTask(TypeBookingReminder, data, opts...), nil
}

// NewAnnouncementEmailTask creates an Asynq task for announcement emails.
func NewAnnouncementEmailTask(payload AnnouncementEmailPayload, opts ...asynq.Option) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal announcement email payload: %w", err)
	}
	return asynq.NewTask(TypeAnnouncementEmail, data, opts...), nil
}

// ── Task Handlers ──────────────────────────────────────────────

// TemplatedEmailSender sends emails with template rendering.
type TemplatedEmailSender interface {
	SendTemplated(ctx context.Context, to, subject, template string, data map[string]string) error
}

// TokenPruner removes stale FCM tokens from storage.
type TokenPruner interface {
	Delete(ctx context.Context, token string) error
}

// Handler holds dependencies for processing tasks.
type Handler struct {
	EmailSender     func(ctx context.Context, to, subject, body string) error
	TemplatedSender TemplatedEmailSender
	// FCMSender returns failed tokens so stale registrations can be pruned.
	FCMSender                func(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]string, error)
	ReminderHandler          func(ctx context.Context, bookingID uint64, reminderType string) error
	AnnouncementEmailHandler func(ctx context.Context, announcementID uint64, audience string) error
	TokenPruner              TokenPruner
}

// NewHandler creates a task handler with the given dependencies.
func NewHandler(
	emailSender func(ctx context.Context, to, subject, body string) error,
	fcmSender func(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]string, error),
	reminderHandler func(ctx context.Context, bookingID uint64, reminderType string) error,
) *Handler {
	return &Handler{
		EmailSender:     emailSender,
		FCMSender:       fcmSender,
		ReminderHandler: reminderHandler,
	}
}

// HandleEmailDelivery processes email delivery tasks.
func (h *Handler) HandleEmailDelivery(ctx context.Context, t *asynq.Task) error {
	var p EmailDeliveryPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal email payload: %w", err)
	}

	// Prefer templated sender if available (renders HTML templates)
	if h.TemplatedSender != nil {
		return h.TemplatedSender.SendTemplated(ctx, p.To, p.Subject, p.Template, p.Data)
	}

	// Fallback to plain text sender
	if h.EmailSender != nil {
		body := fmt.Sprintf("Email template: %s, data: %v", p.Template, p.Data)
		return h.EmailSender(ctx, p.To, p.Subject, body)
	}

	fmt.Printf("[EMAIL] to=%s subject=%s template=%s\n", p.To, p.Subject, p.Template)
	return nil
}

// HandleFCMNotification processes FCM push notification tasks.
func (h *Handler) HandleFCMNotification(ctx context.Context, t *asynq.Task) error {
	var p FCMNotificationPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal fcm payload: %w", err)
	}
	if h.FCMSender != nil {
		failed, err := h.FCMSender(ctx, p.Tokens, p.Title, p.Body, p.Data)
		if err != nil {
			return err
		}
		// Prune stale tokens in best-effort fashion
		if h.TokenPruner != nil {
			for _, token := range failed {
				_ = h.TokenPruner.Delete(ctx, token)
			}
		}
		return nil
	}
	fmt.Printf("[FCM] tokens=%d title=%s body=%s\n", len(p.Tokens), p.Title, p.Body)
	return nil
}

// HandleBookingReminder processes booking reminder tasks.
func (h *Handler) HandleBookingReminder(ctx context.Context, t *asynq.Task) error {
	var p BookingReminderPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal reminder payload: %w", err)
	}
	if h.ReminderHandler != nil {
		return h.ReminderHandler(ctx, p.BookingID, p.ReminderType)
	}
	fmt.Printf("[REMINDER] booking_id=%d type=%s\n", p.BookingID, p.ReminderType)
	return nil
}

// HandleAnnouncementEmail processes announcement email tasks.
func (h *Handler) HandleAnnouncementEmail(ctx context.Context, t *asynq.Task) error {
	var p AnnouncementEmailPayload
	if err := json.Unmarshal(t.Payload(), &p); err != nil {
		return fmt.Errorf("unmarshal announcement email payload: %w", err)
	}
	if h.AnnouncementEmailHandler != nil {
		return h.AnnouncementEmailHandler(ctx, p.AnnouncementID, p.Audience)
	}
	fmt.Printf("[ANNOUNCEMENT EMAIL] announcement_id=%d audience=%s\n", p.AnnouncementID, p.Audience)
	return nil
}
