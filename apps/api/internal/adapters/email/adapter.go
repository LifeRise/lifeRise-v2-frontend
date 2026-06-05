package email

import (
	"context"
)

// TemplateSender wraps SMTPClient to implement notification.EmailClient.
type TemplateSender struct {
	client *SMTPClient
}

// NewTemplateSender creates a template email sender adapter.
func NewTemplateSender(client *SMTPClient) *TemplateSender {
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
