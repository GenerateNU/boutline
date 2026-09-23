package utils

import (
	"fmt"

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
