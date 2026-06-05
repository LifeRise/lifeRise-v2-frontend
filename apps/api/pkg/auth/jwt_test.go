package auth

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestService_GenerateAndValidateTokenPair(t *testing.T) {
	svc := NewService(Config{
		Secret:        "test-secret-that-is-32-bytes-long!!",
		AccessExpiry:  15 * time.Minute,
		RefreshExpiry: 7 * 24 * time.Hour,
		Issuer:        "test-issuer",
	})

	claims := Claims{
		UserID:      42,
		UserType:    "customer",
		Roles:       []string{"customer"},
		Permissions: []string{"bookings.view"},
		Timezone:    "America/Denver",
	}

	pair, err := svc.GenerateTokenPair(claims)
	require.NoError(t, err)
	assert.NotEmpty(t, pair.AccessToken)
	assert.NotEmpty(t, pair.RefreshToken)
	assert.Equal(t, "Bearer", pair.TokenType)
	assert.Equal(t, int64(900), pair.ExpiresIn) // 15 minutes

	parsed, err := svc.ValidateToken(pair.AccessToken)
	require.NoError(t, err)
	assert.Equal(t, uint64(42), parsed.UserID)
	assert.Equal(t, "customer", parsed.UserType)
	assert.Contains(t, parsed.Roles, "customer")
	assert.Equal(t, "America/Denver", parsed.Timezone)
}

func TestService_ValidateToken_Expired(t *testing.T) {
	svc := NewService(Config{
		Secret:       "test-secret-that-is-32-bytes-long!!",
		AccessExpiry: -1 * time.Second, // already expired
		Issuer:       "test-issuer",
	})

	claims := Claims{UserID: 1, UserType: "customer"}
	pair, err := svc.GenerateTokenPair(claims)
	require.NoError(t, err)

	_, err = svc.ValidateToken(pair.AccessToken)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "expired")
}

func TestService_ValidateToken_Invalid(t *testing.T) {
	svc := NewService(Config{
		Secret: "test-secret-that-is-32-bytes-long!!",
	})

	_, err := svc.ValidateToken("not.a.valid.token")
	assert.Error(t, err)
}
