package auth

import (
	"golang.org/x/crypto/bcrypt"
)

// VerifyPassword checks a plain password against a Laravel bcrypt hash.
// Laravel uses bcrypt cost 10-12 by default. Go's bcrypt is fully compatible.
func VerifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// HashPassword generates a bcrypt hash from a plain password.
// Uses bcrypt.DefaultCost (currently 10) for compatibility with Laravel defaults.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}
