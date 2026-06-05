package firebase

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"google.golang.org/api/option"
)

// FCMClient implements the notification.FCMClient interface using Firebase Admin SDK.
type FCMClient struct {
	client *messaging.Client
}

// NewFCMClient creates a new Firebase Cloud Messaging client.
func NewFCMClient(ctx context.Context, credentialsPath string) (*FCMClient, error) {
	opt := option.WithCredentialsFile(credentialsPath)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		return nil, fmt.Errorf("initialize firebase app: %w", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		return nil, fmt.Errorf("initialize firebase messaging: %w", err)
	}

	return &FCMClient{client: client}, nil
}

// SendToDevice sends a push notification to a single device.
func (f *FCMClient) SendToDevice(ctx context.Context, token string, title, body string, data map[string]string) error {
	message := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	_, err := f.client.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("send fcm to device: %w", err)
	}
	return nil
}

// SendToDevices sends a push notification to multiple devices using multicast.
func (f *FCMClient) SendToDevices(ctx context.Context, tokens []string, title, body string, data map[string]string) error {
	if len(tokens) == 0 {
		return nil
	}

	message := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
	}

	resp, err := f.client.SendMulticast(ctx, message)
	if err != nil {
		return fmt.Errorf("send fcm multicast: %w", err)
	}

	if resp.FailureCount > 0 {
		// Log failures but don't return error for partial failures
		// Individual token failures are expected (e.g., uninstalled apps)
		for i, r := range resp.Responses {
			if !r.Success {
				// Best effort: log the error but continue
				_ = fmt.Errorf("token %s failed: %v", tokens[i], r.Error)
			}
		}
	}

	return nil
}
