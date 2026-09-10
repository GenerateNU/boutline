package errs

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
)

// Services return these sentinels; ErrorHandler is the only place that decides
// which HTTP status each one maps to.
var (
	ErrNotFound     = errors.New("not found")
	ErrDuplicate    = errors.New("already exists")
	ErrInvalidInput = errors.New("invalid input")
)

type APIError struct {
	StatusCode int `json:"statusCode"`
	Message    any `json:"message"`
}

func (e APIError) Error() string {
	return fmt.Sprintf("api error: %d", e.StatusCode)
}

func NewAPIError(statusCode int, err error) APIError {
	return APIError{StatusCode: statusCode, Message: err.Error()}
}

func InvalidJSON() APIError {
	return NewAPIError(http.StatusBadRequest, errors.New("invalid JSON request data"))
}

func InternalServerError() APIError {
	return NewAPIError(http.StatusInternalServerError, errors.New("internal server error"))
}

type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func ValidationError(err error) APIError {
	return APIError{
		StatusCode: http.StatusUnprocessableEntity,
		Message:    formatValidationErrors(err),
	}
}

func formatValidationErrors(err error) []FieldError {
	var validationErrors validator.ValidationErrors
	if !errors.As(err, &validationErrors) {
		return []FieldError{{Field: "unknown", Message: err.Error()}}
	}

	fieldErrors := make([]FieldError, 0, len(validationErrors))
	for _, e := range validationErrors {
		fieldErrors = append(fieldErrors, FieldError{Field: e.Field(), Message: buildMessage(e)})
	}

	return fieldErrors
}

func buildMessage(e validator.FieldError) string {
	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s is required", e.Field())
	case "email":
		return fmt.Sprintf("%s must be a valid email", e.Field())
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", e.Field(), e.Param())
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", e.Field(), e.Param())
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", e.Field(), e.Param())
	case "url":
		return fmt.Sprintf("%s must be a valid URL", e.Field())
	case "uuid":
		return fmt.Sprintf("%s must be a valid UUID", e.Field())
	default:
		return fmt.Sprintf("%s failed %s validation", e.Field(), e.Tag())
	}
}

// ErrorHandler is Fiber's single exit point for errors, so no handler needs to
// translate a domain error into a status code itself.
func ErrorHandler(c *fiber.Ctx, err error) error {
	apiErr := toAPIError(err)

	slog.Error("HTTP API error",
		"err", err.Error(),
		"status", apiErr.StatusCode,
		"method", c.Method(),
		"path", c.Path(),
	)

	return c.Status(apiErr.StatusCode).JSON(apiErr)
}

func toAPIError(err error) APIError {
	var apiErr APIError
	if errors.As(err, &apiErr) {
		return apiErr
	}

	var validationErrors validator.ValidationErrors
	if errors.As(err, &validationErrors) {
		return ValidationError(err)
	}

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		return NewAPIError(fiberErr.Code, fiberErr)
	}

	switch {
	case errors.Is(err, ErrNotFound):
		return NewAPIError(http.StatusNotFound, err)
	case errors.Is(err, ErrDuplicate):
		return NewAPIError(http.StatusConflict, err)
	case errors.Is(err, ErrInvalidInput):
		return NewAPIError(http.StatusBadRequest, err)
	default:
		// Anything unrecognised is a bug, not a client problem: log the detail
		// above but never leak it in the response.
		return InternalServerError()
	}
}
