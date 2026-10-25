package utils

import (
	"fmt"
	"strings"

	"boutline/internal/errs"

	"github.com/google/uuid"
)

func ParseUUID(raw string, field string) (uuid.UUID, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, errs.Public(
			fmt.Sprintf("%s must be a valid uuid", field), errs.ErrInvalidInput)
	}

	return id, nil
}

// ParseUUIDList splits raw on commas, skipping empty elements, and parses each
// remaining one with ParseUUID. Duplicates are passed through unchanged. A
// nonempty raw with no parsable elements (e.g. ",,,") is rejected rather than
// treated as an empty filter, which would otherwise match every row.
func ParseUUIDList(raw string, field string) ([]uuid.UUID, error) {
	var ids []uuid.UUID

	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		id, err := ParseUUID(part, field)
		if err != nil {
			return nil, err
		}

		ids = append(ids, id)
	}

	if raw != "" && len(ids) == 0 {
		return nil, errs.Public(
			fmt.Sprintf("%s must contain at least one valid uuid", field), errs.ErrInvalidInput)
	}

	return ids, nil
}
