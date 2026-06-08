package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenType identifies the kind of token being issued.
type TokenType string

const (
	TokenTypeAccess  TokenType = "access"
	TokenTypeRefresh TokenType = "refresh"
)

// Claims extends jwt.RegisteredClaims with LifeRise-specific fields.
// Must remain compatible with mobile app parsing expectations.
type Claims struct {
	jwt.RegisteredClaims
	UserID          uint64           `json:"sub"`
	UserType        string           `json:"type"` // "customer" | "user"
	Roles           []string         `json:"roles"`
	Permissions     []string         `json:"permissions"`
	RoleAssignments []RoleAssignment `json:"role_assignments,omitempty"`
	Timezone        string           `json:"timezone,omitempty"`
	EmailVerifiedAt *int64           `json:"email_verified_at,omitempty"`
}

// RoleAssignment represents a company-scoped role assignment.
type RoleAssignment struct {
	Role      string  `json:"role"`
	CompanyID *uint64 `json:"company_id,omitempty"`
}

// TokenPair holds access and refresh tokens.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"` // seconds
	TokenType    string `json:"token_type"`
}

// Config holds JWT signing configuration.
type Config struct {
	Secret        string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
	Issuer        string
}

// Service provides JWT issuance and validation.
type Service struct {
	config Config
}

// NewService creates a new JWT service.
func NewService(config Config) *Service {
	return &Service{config: config}
}

// GenerateTokenPair creates an access token and a refresh token.
func (s *Service) GenerateTokenPair(claims Claims) (*TokenPair, error) {
	now := time.Now().UTC()

	accessClaims := claims
	accessClaims.RegisteredClaims = jwt.RegisteredClaims{
		Issuer:    s.config.Issuer,
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessExpiry)),
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessSigned, err := accessToken.SignedString([]byte(s.config.Secret))
	if err != nil {
		return nil, fmt.Errorf("sign access token: %w", err)
	}

	refreshClaims := jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", claims.UserID),
		Issuer:    s.config.Issuer,
		IssuedAt:  jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(s.config.RefreshExpiry)),
		ID:        fmt.Sprintf("refresh_%d_%d", claims.UserID, now.Unix()),
	}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshSigned, err := refreshToken.SignedString([]byte(s.config.Secret))
	if err != nil {
		return nil, fmt.Errorf("sign refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessSigned,
		RefreshToken: refreshSigned,
		ExpiresIn:    int64(s.config.AccessExpiry.Seconds()),
		TokenType:    "Bearer",
	}, nil
}

// ValidateToken parses and validates an access-token JWT string, returning the embedded Claims.
func (s *Service) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.Secret), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, errors.New("token expired")
		}
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}

// ValidateRefreshToken parses a refresh token (which only contains RegisteredClaims)
// and returns the user ID embedded in the Subject claim.
func (s *Service) ValidateRefreshToken(tokenString string) (uint64, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.Secret), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return 0, errors.New("token expired")
		}
		return 0, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid {
		return 0, errors.New("invalid token claims")
	}

	if claims.Subject == "" {
		return 0, errors.New("refresh token missing subject")
	}

	var userID uint64
	_, err = fmt.Sscanf(claims.Subject, "%d", &userID)
	if err != nil {
		return 0, fmt.Errorf("invalid refresh token subject: %w", err)
	}

	return userID, nil
}

// ExtractClaims extracts Claims from a parsed JWT token (e.g., from Gin context).
func ExtractClaims(token *jwt.Token) (*Claims, error) {
	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid claims type")
	}
	return claims, nil
}
