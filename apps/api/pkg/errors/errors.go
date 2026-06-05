package errors

import "errors"

// Common application errors used across domains.
var (
	ErrNotFound             = errors.New("resource not found")
	ErrConflict             = errors.New("resource conflict")
	ErrUnauthorized         = errors.New("unauthorized")
	ErrForbidden            = errors.New("forbidden")
	ErrValidation           = errors.New("validation failed")
	ErrInternal             = errors.New("internal server error")
	ErrBadRequest           = errors.New("bad request")
	ErrTooManyRequests      = errors.New("too many requests")
	ErrPaymentRequired      = errors.New("payment required")
	ErrStripeConnect        = errors.New("stripe connect error")
	ErrBookingConflict      = errors.New("booking conflict")
	ErrSlotUnavailable      = errors.New("slot unavailable")
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrTokenExpired         = errors.New("token expired")
	ErrTokenInvalid         = errors.New("token invalid")
	ErrOTPInvalid           = errors.New("invalid or expired otp")
	ErrRoleUnauthorized     = errors.New("role unauthorized")
	ErrCompanyScopeMismatch = errors.New("company scope mismatch")
)

// AppError is a structured application error that can be serialized to HTTP responses.
type AppError struct {
	Code    string `json:"code,omitempty"`
	Message string `json:"message"`
	Status  int    `json:"status"`
}

func (e AppError) Error() string {
	return e.Message
}

// NewAppError creates a new AppError.
func NewAppError(code string, message string, status int) AppError {
	return AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}

// Common HTTP mapped errors.
var (
	NotFound           = NewAppError("NOT_FOUND", "The requested resource was not found.", 404)
	Conflict           = NewAppError("CONFLICT", "The resource already exists.", 409)
	Unauthorized       = NewAppError("UNAUTHORIZED", "Authentication required.", 401)
	Forbidden          = NewAppError("FORBIDDEN", "Insufficient permissions.", 403)
	ValidationFailed   = NewAppError("VALIDATION_ERROR", "The given data was invalid.", 422)
	Internal           = NewAppError("INTERNAL_ERROR", "An internal server error occurred.", 500)
	BadRequest         = NewAppError("BAD_REQUEST", "The request could not be understood.", 400)
	TooManyRequests    = NewAppError("TOO_MANY_REQUESTS", "Rate limit exceeded. Please try again later.", 429)
	StripeConnectError = NewAppError("STRIPE_CONNECT_ERROR", "A payment processing error occurred.", 502)
)
