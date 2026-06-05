package email

import (
	"bytes"
	"context"
	"crypto/tls"
	"fmt"
	"html/template"
	"net"
	"net/smtp"
	"strings"

	"github.com/liferise/backend/internal/infrastructure/config"
)

// SMTPClient sends emails via SMTP.
type SMTPClient struct {
	cfg       config.MailConfig
	templates *template.Template
}

// NewSMTPClient creates an SMTP client from config.
func NewSMTPClient(cfg config.MailConfig) *SMTPClient {
	// Parse embedded templates
	tmpl := template.New("emails")
	tmpl, _ = tmpl.Parse(passwordResetTemplate)

	return &SMTPClient{cfg: cfg, templates: tmpl}
}

// Send delivers a raw email with the given subject and body.
func (s *SMTPClient) Send(ctx context.Context, to, subject, body string) error {
	if s.cfg.Host == "" {
		return fmt.Errorf("smtp host not configured")
	}

	from := s.cfg.FromAddress
	if from == "" {
		from = s.cfg.Username
	}

	fromName := s.cfg.FromName
	if fromName == "" {
		fromName = "LifeRise"
	}

	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprintf("%d", s.cfg.Port))

	// Determine if we should use TLS (port 465) or STARTTLS (port 587)
	if s.cfg.Encryption == "ssl" || s.cfg.Port == 465 {
		return s.sendTLS(addr, from, fromName, to, subject, body)
	}
	return s.sendSTARTTLS(addr, from, fromName, to, subject, body)
}

// SendTemplated renders a named template with data and sends a multipart email.
func (s *SMTPClient) SendTemplated(ctx context.Context, to, subject, templateName string, data map[string]string) error {
	// Render HTML body
	htmlBody, err := s.renderTemplate(templateName+".html", data)
	if err != nil {
		// Fallback: try without .html suffix for backward compat
		htmlBody, err = s.renderTemplate(templateName, data)
		if err != nil {
			// Last resort: plain text fallback
			return s.Send(ctx, to, subject, fmt.Sprintf("Template: %s\nData: %v", templateName, data))
		}
	}

	// Build plain text fallback (strip HTML tags roughly)
	plainBody := stripHTML(htmlBody)

	// Build multipart MIME message
	msg := buildMultipartMessage(s.cfg, to, subject, plainBody, htmlBody)

	from := s.cfg.FromAddress
	if from == "" {
		from = s.cfg.Username
	}

	addr := net.JoinHostPort(s.cfg.Host, fmt.Sprintf("%d", s.cfg.Port))
	if s.cfg.Encryption == "ssl" || s.cfg.Port == 465 {
		return s.sendRawTLS(addr, from, to, msg)
	}
	return s.sendRawSTARTTLS(addr, from, to, msg)
}

func (s *SMTPClient) renderTemplate(name string, data map[string]string) (string, error) {
	if s.templates == nil {
		return "", fmt.Errorf("no templates loaded")
	}
	var buf bytes.Buffer
	if err := s.templates.ExecuteTemplate(&buf, name, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func buildMultipartMessage(cfg config.MailConfig, to, subject, plainBody, htmlBody string) string {
	from := cfg.FromAddress
	if from == "" {
		from = cfg.Username
	}
	fromName := cfg.FromName
	if fromName == "" {
		fromName = "LifeRise"
	}

	boundary := "=_LifeRiseBoundary_" + randomBoundarySuffix()

	var msg strings.Builder
	fmt.Fprintf(&msg, "From: %s <%s>\r\n", fromName, from)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", subject)
	msg.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&msg, "Content-Type: multipart/alternative; boundary=\"%s\"\r\n", boundary)
	msg.WriteString("\r\n")

	// Plain text part
	fmt.Fprintf(&msg, "--%s\r\n", boundary)
	msg.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	msg.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(plainBody)
	msg.WriteString("\r\n\r\n")

	// HTML part
	fmt.Fprintf(&msg, "--%s\r\n", boundary)
	msg.WriteString("Content-Type: text/html; charset=\"utf-8\"\r\n")
	msg.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)
	msg.WriteString("\r\n\r\n")

	fmt.Fprintf(&msg, "--%s--\r\n", boundary)
	return msg.String()
}

func stripHTML(input string) string {
	// Very basic HTML tag stripping for plain text fallback
	var output strings.Builder
	inTag := false
	for _, r := range input {
		if r == '<' {
			inTag = true
			continue
		}
		if r == '>' {
			inTag = false
			continue
		}
		if !inTag {
			output.WriteRune(r)
		}
	}
	// Clean up extra whitespace
	result := output.String()
	result = strings.ReplaceAll(result, "&nbsp;", " ")
	result = strings.ReplaceAll(result, "&middot;", "·")
	result = strings.ReplaceAll(result, "  ", " ")
	return strings.TrimSpace(result)
}

func randomBoundarySuffix() string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 16)
	for i := range b {
		b[i] = chars[i%len(chars)]
	}
	return string(b)
}

// sendTLS sends email over implicit TLS (port 465).
func (s *SMTPClient) sendTLS(addr, from, fromName, to, subject, body string) error {
	tlsConfig := &tls.Config{ServerName: s.cfg.Host}
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("dial tls: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	if err := s.authenticate(client); err != nil {
		return err
	}

	return s.sendMessage(client, from, to, buildSimpleMessage(from, fromName, to, subject, body))
}

// sendSTARTTLS sends email over STARTTLS (port 587).
func (s *SMTPClient) sendSTARTTLS(addr, from, fromName, to, subject, body string) error {
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: s.cfg.Host}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}

	if err := s.authenticate(client); err != nil {
		return err
	}

	return s.sendMessage(client, from, to, buildSimpleMessage(from, fromName, to, subject, body))
}

// sendRawTLS sends a pre-built MIME message over TLS.
func (s *SMTPClient) sendRawTLS(addr, from, to, msg string) error {
	tlsConfig := &tls.Config{ServerName: s.cfg.Host}
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		return fmt.Errorf("dial tls: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	if err := s.authenticate(client); err != nil {
		return err
	}

	return s.sendMessage(client, from, to, msg)
}

// sendRawSTARTTLS sends a pre-built MIME message over STARTTLS.
func (s *SMTPClient) sendRawSTARTTLS(addr, from, to, msg string) error {
	client, err := smtp.Dial(addr)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		tlsConfig := &tls.Config{ServerName: s.cfg.Host}
		if err := client.StartTLS(tlsConfig); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}

	if err := s.authenticate(client); err != nil {
		return err
	}

	return s.sendMessage(client, from, to, msg)
}

func (s *SMTPClient) authenticate(client *smtp.Client) error {
	if s.cfg.Username != "" && s.cfg.Password != "" {
		auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	return nil
}

func (s *SMTPClient) sendMessage(client *smtp.Client, from, to, msg string) error {
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("smtp mail: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	_, err = w.Write([]byte(msg))
	if err != nil {
		w.Close()
		return fmt.Errorf("smtp write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close data: %w", err)
	}
	return client.Quit()
}

func buildSimpleMessage(from, fromName, to, subject, body string) string {
	var msg strings.Builder
	fmt.Fprintf(&msg, "From: %s <%s>\r\n", fromName, from)
	fmt.Fprintf(&msg, "To: %s\r\n", to)
	fmt.Fprintf(&msg, "Subject: %s\r\n", subject)
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(body)
	return msg.String()
}
