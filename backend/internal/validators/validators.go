package validators

import "github.com/go-playground/validator/v10"

// NewValidator is where custom `validate:"..."` tags get registered, so every
// layer shares one configured instance.
func NewValidator() *validator.Validate {
	return validator.New()
}
