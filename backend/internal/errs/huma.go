package errs

import "github.com/danielgtaylor/huma/v2"

// HumaError is the Huma-side twin of ErrorHandler: handlers return
// errs.HumaError(err) and the status mapping stays in this package. Huma
// serialises its own errors, so it never reaches Fiber's ErrorHandler.
func HumaError(err error) error {
	status := StatusFor(err)

	logError(err, status)

	return huma.NewError(status, ClientMessage(err))
}
