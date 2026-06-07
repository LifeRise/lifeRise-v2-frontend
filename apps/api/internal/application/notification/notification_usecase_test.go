package notification

import (
	"context"
	"testing"
	"time"

	"github.com/hibiken/asynq"
	"gorm.io/gorm"

	"github.com/liferise/backend/internal/adapters/queue/tasks"
	"github.com/liferise/backend/internal/infrastructure/config"
	"github.com/liferise/backend/internal/infrastructure/database"
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
		ID:            "fake-id",
		Queue:         "default",
		Type:          task.Type(),
		Payload:       task.Payload(),
		State:         asynq.TaskStatePending,
		NextProcessAt: time.Now(),
	}, nil
}

func (f *fakeAsynqClient) Close() error {
	return nil
}

type fakeDeviceTokenRepo struct {
	tokens map[string]struct{}
}

func newFakeDeviceTokenRepo() *fakeDeviceTokenRepo {
	return &fakeDeviceTokenRepo{tokens: make(map[string]struct{})}
}

func (f *fakeDeviceTokenRepo) Upsert(_ context.Context, _ interface{}, _ uint64, token, _ string) error {
	f.tokens[token] = struct{}{}
	return nil
}

func (f *fakeDeviceTokenRepo) GetByUser(_ context.Context, _ interface{}, _ uint64) ([]string, error) {
	var result []string
	for t := range f.tokens {
		result = append(result, t)
	}
	return result, nil
}

func (f *fakeDeviceTokenRepo) Delete(_ context.Context, _ interface{}, token string) error {
	delete(f.tokens, token)
	return nil
}

func (f *fakeDeviceTokenRepo) HasToken(token string) bool {
	_, ok := f.tokens[token]
	return ok
}

func newTestDB(t *testing.T) *gorm.DB {
	db, err := database.New(&config.DatabaseConfig{
		Driver: "sqlite",
		URL:    "file::memory:?cache=shared",
	}, true)
	if err != nil {
		t.Fatalf("failed to create test db: %v", err)
	}
	return db
}

func TestSendEmail(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(nil, nil, client, nil, nil, nil)

	ctx := context.Background()
	err := uc.SendEmail(ctx, 1, "user@example.com", "Welcome", "welcome_email", map[string]string{"Name": "John"}, "email")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := client.enqueued[tasks.TypeEmailDelivery]; !ok {
		t.Errorf("expected email task to be enqueued")
	}
}

func TestSendPushNotification(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(nil, nil, client, nil, nil, nil)

	ctx := context.Background()
	err := uc.SendPushNotification(ctx, 1, []string{"token1", "token2"}, "Title", "Body", map[string]string{"key": "value"}, "push")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := client.enqueued[tasks.TypeFCMNotification]; !ok {
		t.Errorf("expected FCM task to be enqueued")
	}
}

func TestSendPushNotification_NoTokens(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(nil, nil, client, nil, nil, nil)

	ctx := context.Background()
	err := uc.SendPushNotification(ctx, 1, []string{}, "Title", "Body", nil, "push")
	if err != nil {
		t.Fatalf("unexpected error for empty tokens: %v", err)
	}
	if _, ok := client.enqueued[tasks.TypeFCMNotification]; ok {
		t.Errorf("expected no FCM task to be enqueued for empty token list")
	}
}

func TestSendBookingConfirmation(t *testing.T) {
	client := newFakeAsynqClient()
	uc := NewUseCase(nil, nil, client, nil, nil, nil)

	ctx := context.Background()
	err := uc.SendBookingConfirmation(ctx, 1, "user@example.com", []string{"token1"}, 42)
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
	uc := NewUseCase(nil, nil, client, nil, nil, nil)

	ctx := context.Background()
	err := uc.SendBookingReminder(ctx, 1, "user@example.com", []string{"token1"}, 42, "2024-01-01T10:00:00Z")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := client.enqueued[tasks.TypeBookingReminder]; !ok {
		t.Errorf("expected reminder task to be enqueued")
	}
}

func TestRegisterDeviceToken(t *testing.T) {
	db := newTestDB(t)
	repo := newFakeDeviceTokenRepo()
	uc := NewUseCase(db, nil, nil, nil, nil, repo)

	ctx := context.Background()
	err := uc.RegisterDeviceToken(ctx, 1, "fcm-token-abc", "web")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !repo.HasToken("fcm-token-abc") {
		t.Errorf("expected token to be stored")
	}
}

func TestDeleteDeviceToken(t *testing.T) {
	db := newTestDB(t)
	repo := newFakeDeviceTokenRepo()
	uc := NewUseCase(db, nil, nil, nil, nil, repo)

	ctx := context.Background()
	_ = uc.RegisterDeviceToken(ctx, 1, "fcm-token-abc", "web")
	if err := uc.DeleteDeviceToken(ctx, "fcm-token-abc"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.HasToken("fcm-token-abc") {
		t.Errorf("expected token to be deleted")
	}
}
