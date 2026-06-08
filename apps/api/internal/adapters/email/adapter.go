package email

import (
	"context"
)

// templatedSender is implemented by both SMTPClient and ResendClient.
type templatedSender interface {
	Send(ctx context.Context, to, subject, body string) error
	SendTemplated(ctx context.Context, to, subject, template string, data map[string]string) error
}

// TemplateSender wraps an email client to implement notification.EmailClient.
type TemplateSender struct {
	client templatedSender
}

// NewTemplateSender creates a template email sender adapter.
func NewTemplateSender(client templatedSender) *TemplateSender {
	return &TemplateSender{client: client}
}

// Send implements the notification.EmailClient interface.
func (t *TemplateSender) Send(ctx context.Context, to, subject, template string, data map[string]string) error {
	return t.client.SendTemplated(ctx, to, subject, template, data)
}

// SendTemplated implements the tasks.TemplatedEmailSender interface.
func (t *TemplateSender) SendTemplated(ctx context.Context, to, subject, template string, data map[string]string) error {
	return t.client.SendTemplated(ctx, to, subject, template, data)
}
