package notification

import (
	"context"
	"testing"
	"time"

	"github.com/hibiken/asynq"

	"github.com/liferise/backend/internal/adapters/queue/tasks"
)

type fakeAsynqClient struct {
	enqueued map[string]*asynq.Task
}

func newFakeAsynqClient() *fakeAsynqClient {
	return &fakeAsynqClient{enqueued: make(map[string]*asynq.Task)}
}

func (f *fakeAsynqClient) Enqueue(task *asynq.Task, opts ...asynq.Option) (*asynq.TaskInfo, error) {
	f.enqueued[task.Type()] = task
	return &asynq.TaskInfo{
		ID:        "fake-id",
		Queue:     "default",
		Type:      task.Type(),
		Payload:   task.Payload(),
		State:     asynq.TaskStatePending,
		NextProcessAt: time.Now(),
	}, nil
}

func (f *fakeAsynqClient) Close() error {
	return nil
}

func TestSendEmail(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(client, nil, nil)

	ctx := context.Background()
	err := uc.SendEmail(ctx, "user@example.com", "Welcome", "welcome_email", map[string]string{"Name": "John"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := client.enqueued[tasks.TypeEmailDelivery]; !ok {
		t.Errorf("expected email task to be enqueued")
	}
}

func TestSendPushNotification(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(client, nil, nil)

	ctx := context.Background()
	err := uc.SendPushNotification(ctx, []string{"token1", "token2"}, "Title", "Body", map[string]string{"key": "value"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := client.enqueued[tasks.TypeFCMNotification]; !ok {
		t.Errorf("expected FCM task to be enqueued")
	}
}

func TestSendBookingConfirmation(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(client, nil, nil)

	ctx := context.Background()
	err := uc.SendBookingConfirmation(ctx, "user@example.com", []string{"token1"}, 42)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := client.enqueued[tasks.TypeEmailDelivery]; !ok {
		t.Errorf("expected email task to be enqueued")
	}
	if _, ok := client.enqueued[tasks.TypeFCMNotification]; !ok {
		t.Errorf("expected FCM task to be enqueued")
	}
}

func TestEnqueueBookingReminder(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(client, nil, nil)

	ctx := context.Background()
	err := uc.SendBookingReminder(ctx, "user@example.com", []string{"token1"}, 42, "2024-01-01T10:00:00Z")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := client.enqueued[tasks.TypeBookingReminder]; !ok {
		t.Errorf("expected reminder task to be enqueued")
	}
}
