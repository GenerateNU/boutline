package errs

import (
	"errors"
	"log/slog"

	"github.com/danielgtaylor/huma/v2"
)

// HumaError is the Huma-side twin of ErrorHandler: handlers return
// errs.HumaError(err) and the status mapping stays in this package. Huma
// serialises its own errors, so it never reaches Fiber's ErrorHandler.
func HumaError(err error) error {
	switch {
	case errors.Is(err, ErrNotFound):
		return huma.Error404NotFound(err.Error())
	case errors.Is(err, ErrDuplicate):
		return huma.Error409Conflict(err.Error())
	case errors.Is(err, ErrInvalidInput):
		return huma.Error400BadRequest(err.Error())
	default:
		// The detail is dropped from the response, so the log is the only
		// record of what actually broke.
		slog.Error("unhandled service error", "err", err.Error())
		return huma.Error500InternalServerError("internal server error")
	}
}
