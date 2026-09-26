package errs

import (
	"errors"
	"net/http"
)

// publicError carries a message that is safe to send to a client. Wrap a
// sentinel with Public when the caller genuinely needs to know why; without it
// a client only ever reads the sentinel's own generic text, while the full
// wrapped chain goes to the log.
type publicError struct {
	message string
	err     error
}

func Public(message string, err error) error {
	return publicError{message: message, err: err}
}

// Error keeps the chain intact so the log still shows where the error came
// from; only ClientMessage narrows it down to the public part.
func (e publicError) Error() string {
	return e.message + ": " + e.err.Error()
}

func (e publicError) Unwrap() error {
	return e.err
}

// ClientMessage is everything a client is allowed to read: an explicit Public
// message when a service set one, otherwise the sentinel's own text. Anything
// unrecognised — a driver error, a wrapped call chain — collapses to a generic
// message that says nothing about the internals.
func ClientMessage(err error) string {
	var public publicError
	if errors.As(err, &public) {
		return public.message
	}

	switch {
	case errors.Is(err, ErrNotFound):
		return ErrNotFound.Error()
	case errors.Is(err, ErrDuplicate):
		return ErrDuplicate.Error()
	case errors.Is(err, ErrInvalidInput):
		return ErrInvalidInput.Error()
	case errors.Is(err, ErrConflict):
		return ErrConflict.Error()
	default:
		return "internal server error"
	}
}

// StatusFor is the one place a sentinel becomes an HTTP status; both the Fiber
// ErrorHandler and HumaError read it, so the two paths cannot drift.
func StatusFor(err error) int {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrDuplicate):
		return http.StatusConflict
	case errors.Is(err, ErrInvalidInput):
		return http.StatusBadRequest
	case errors.Is(err, ErrConflict):
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}
