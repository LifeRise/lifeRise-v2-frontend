package email

import (
	"bytes"
	"context"
	"fmt"
	"html/template"

	"github.com/resend/resend-go/v2"
)

// ResendClient sends emails via the Resend API.
type ResendClient struct {
	client    *resend.Client
	from      string
	fromName  string
	templates *template.Template
}

// NewResendClient creates a Resend email client.
func NewResendClient(apiKey, fromAddress, fromName string) *ResendClient {
	if fromAddress == "" {
		fromAddress = "onboarding@resend.dev"
	}
	if fromName == "" {
		fromName = "LifeRise"
	}

	tmpl := template.New("emails")
	tmpl, _ = tmpl.Parse(passwordResetTemplate)
	tmpl, _ = tmpl.Parse(announcementTemplate)

	return &ResendClient{
		client:    resend.NewClient(apiKey),
		from:      fromAddress,
		fromName:  fromName,
		templates: tmpl,
	}
}

// Send delivers a raw plain-text email.
func (r *ResendClient) Send(ctx context.Context, to, subject, body string) error {
	params := &resend.SendEmailRequest{
		From:    fmt.Sprintf("%s <%s>", r.fromName, r.from),
		To:      []string{to},
		Subject: subject,
		Text:    body,
	}

	_, err := r.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("resend send: %w", err)
	}
	return nil
}

// SendTemplated renders a named template with data and sends an HTML email.
func (r *ResendClient) SendTemplated(ctx context.Context, to, subject, templateName string, data map[string]string) error {
	htmlBody, err := r.renderTemplate(templateName+".html", data)
	if err != nil {
		// Fallback: try without .html suffix for backward compat
		htmlBody, err = r.renderTemplate(templateName, data)
		if err != nil {
			// Last resort: plain text fallback
			return r.Send(ctx, to, subject, fmt.Sprintf("Template: %s\nData: %v", templateName, data))
		}
	}

	params := &resend.SendEmailRequest{
		From:    fmt.Sprintf("%s <%s>", r.fromName, r.from),
		To:      []string{to},
		Subject: subject,
		Html:    htmlBody,
	}

	_, err = r.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("resend send templated: %w", err)
	}
	return nil
}

func (r *ResendClient) renderTemplate(name string, data map[string]string) (string, error) {
	if r.templates == nil {
		return "", fmt.Errorf("no templates loaded")
	}
	var buf bytes.Buffer
	if err := r.templates.ExecuteTemplate(&buf, name, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}
