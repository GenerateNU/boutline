package validators

import (
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
)

// ParseUUID names the offending field in the message so a client with several
// uuid fields in one request knows which one it got wrong.
func ParseUUID(raw string, field string) (uuid.UUID, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, errs.Public(
			fmt.Sprintf("%s must be a valid uuid", field), errs.ErrInvalidInput)
	}

	return id, nil
}
