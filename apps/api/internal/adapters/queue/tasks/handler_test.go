package tasks

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/hibiken/asynq"
)

func TestHandleEmailDelivery(t *testing.T) {
	var captured struct {
		to      string
		subject string
		body    string
	}

	emailSender := func(ctx context.Context, to, subject, body string) error {
		captured.to = to
		captured.subject = subject
		captured.body = body
		return nil
	}
	handler := NewHandler(emailSender, nil, nil)

	payload, _ := json.Marshal(EmailDeliveryPayload{
		To:       "test@example.com",
		Subject:  "Test Subject",
		Template: "test_template",
		Data:     map[string]string{"key": "value"},
	})
	task := asynq.NewTask(TypeEmailDelivery, payload)

	if err := handler.HandleEmailDelivery(context.Background(), task); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if captured.to != "test@example.com" {
		t.Errorf("expected to=test@example.com, got %s", captured.to)
	}
	if captured.subject != "Test Subject" {
		t.Errorf("expected subject=Test Subject, got %s", captured.subject)
	}
}

func TestHandleFCMNotification(t *testing.T) {
	var captured struct {
		tokens []string
		title  string
		body   string
		data   map[string]string
	}

	fcmSender := func(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]string, error) {
		captured.tokens = tokens
		captured.title = title
		captured.body = body
		captured.data = data
		return nil, nil
	}
	handler := NewHandler(nil, fcmSender, nil)

	payload, _ := json.Marshal(FCMNotificationPayload{
		Tokens: []string{"token1", "token2"},
		Title:  "Test Title",
		Body:   "Test Body",
		Data:   map[string]string{"key": "value"},
	})
	task := asynq.NewTask(TypeFCMNotification, payload)

	if err := handler.HandleFCMNotification(context.Background(), task); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(captured.tokens) != 2 {
		t.Errorf("expected 2 tokens, got %d", len(captured.tokens))
	}
	if captured.title != "Test Title" {
		t.Errorf("expected title=Test Title, got %s", captured.title)
	}
}

func TestHandleFCMNotification_NilSender(t *testing.T) {
	handler := NewHandler(nil, nil, nil) // FCMSender is nil
	payload, _ := json.Marshal(FCMNotificationPayload{
		Tokens: []string{"t1"}, Title: "T", Body: "B",
	})
	err := handler.HandleFCMNotification(context.Background(),
		asynq.NewTask(TypeFCMNotification, payload))
	if err != nil {
		t.Fatalf("nil FCMSender must not return error: %v", err)
	}
}

func TestHandleFCMNotification_BadPayload(t *testing.T) {
	handler := NewHandler(nil, nil, nil)
	err := handler.HandleFCMNotification(context.Background(),
		asynq.NewTask(TypeFCMNotification, []byte("not-json")))
	if err == nil {
		t.Fatal("expected error for malformed payload")
	}
}

func TestHandleBookingReminder(t *testing.T) {
	var captured struct {
		bookingID    uint64
		reminderType string
	}

	reminderProcessor := func(ctx context.Context, bookingID uint64, reminderType string) error {
		captured.bookingID = bookingID
		captured.reminderType = reminderType
		return nil
	}
	handler := NewHandler(nil, nil, reminderProcessor)

	payload, _ := json.Marshal(BookingReminderPayload{
		BookingID:    42,
		ReminderType: "24h_before",
	})
	task := asynq.NewTask(TypeBookingReminder, payload)

	if err := handler.HandleBookingReminder(context.Background(), task); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if captured.bookingID != 42 {
		t.Errorf("expected bookingID=42, got %d", captured.bookingID)
	}
	if captured.reminderType != "24h_before" {
		t.Errorf("expected reminderType=24h_before, got %s", captured.reminderType)
	}
}

func TestHandleAnnouncementEmail(t *testing.T) {
	var captured struct {
		announcementID uint64
		audience       string
	}

	processor := func(ctx context.Context, announcementID uint64, audience string) error {
		captured.announcementID = announcementID
		captured.audience = audience
		return nil
	}
	handler := NewHandler(nil, nil, nil)
	handler.AnnouncementEmailHandler = processor

	payload, _ := json.Marshal(AnnouncementEmailPayload{
		AnnouncementID: 99,
		Audience:       "residents",
	})
	task := asynq.NewTask(TypeAnnouncementEmail, payload)

	if err := handler.HandleAnnouncementEmail(context.Background(), task); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if captured.announcementID != 99 {
		t.Errorf("expected announcementID=99, got %d", captured.announcementID)
	}
	if captured.audience != "residents" {
		t.Errorf("expected audience=residents, got %s", captured.audience)
	}
}
