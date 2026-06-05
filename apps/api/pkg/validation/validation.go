package validation

import (
	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

// Validator is the global validator instance configured with custom LifeRise rules.
var Validator *validator.Validate

func init() {
	Validator = binding.Validator.Engine().(*validator.Validate)
	// Custom validators can be registered here:
	// _ = Validator.RegisterValidation("exists", existsValidator)
	// _ = Validator.RegisterValidation("unique", uniqueValidator)
}

// ValidateStruct validates any struct using tag-based rules.
func ValidateStruct(s interface{}) error {
	return Validator.Struct(s)
}

// ValidationErrorsToMap converts validator errors to Laravel-compatible format.
func ValidationErrorsToMap(err error) map[string][]string {
	errors := make(map[string][]string)
	if verrs, ok := err.(validator.ValidationErrors); ok {
		for _, e := range verrs {
			field := e.Field()
			// Convert validator tag to readable message
			msg := tagToMessage(e)
			errors[field] = append(errors[field], msg)
		}
	}
	return errors
}

func tagToMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "The " + fe.Field() + " field is required."
	case "email":
		return "The " + fe.Field() + " must be a valid email address."
	case "min":
		return "The " + fe.Field() + " must be at least " + fe.Param() + " characters."
	case "max":
		return "The " + fe.Field() + " may not be greater than " + fe.Param() + " characters."
	case "gte":
		return "The " + fe.Field() + " must be greater than or equal to " + fe.Param() + "."
	case "lte":
		return "The " + fe.Field() + " must be less than or equal to " + fe.Param() + "."
	case "oneof":
		return "The selected " + fe.Field() + " is invalid."
	case "datetime":
		return "The " + fe.Field() + " is not a valid datetime."
	default:
		return "The " + fe.Field() + " field is invalid."
	}
}
