package utils

import (
	"errors"
	"fmt"

	"boutline/internal/errs"

	"gorm.io/gorm"
)

// TranslateWriteError maps the constraint errors gorm reports on an insert or
// update to API sentinels. foreignKeyMessage names the referencing columns so
// the client knows which id was wrong; leave it empty on a table without
// foreign keys.
func TranslateWriteError(op, table, foreignKeyMessage string, err error) error {
	switch {
	case errors.Is(err, gorm.ErrDuplicatedKey):
		return fmt.Errorf("%s: %w", op, errs.ErrDuplicate)
	case errors.Is(err, gorm.ErrForeignKeyViolated):
		if foreignKeyMessage == "" {
			foreignKeyMessage = fmt.Sprintf("a %s row references a record that does not exist", table)
		}
		return fmt.Errorf("%s: %w", op, errs.Public(foreignKeyMessage, errs.ErrInvalidInput))
	case errors.Is(err, gorm.ErrCheckConstraintViolated):
		return fmt.Errorf("%s: %w", op,
			errs.Public(fmt.Sprintf("%s fields violate a constraint", table), errs.ErrInvalidInput))
	default:
		return fmt.Errorf("%s: %w", op, err)
	}
}

func TranslateReadError(op string, err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("%s: %w", op, errs.ErrNotFound)
	}
	return fmt.Errorf("%s: %w", op, err)
}

// TranslateDeleteError maps a foreign key violation to a conflict: on a delete
// it means another row still references this one under ON DELETE RESTRICT, not
// that the client sent a bad id. conflictMessage tells the client what is
// holding the row.
func TranslateDeleteError(op, conflictMessage string, err error) error {
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op, errs.Public(conflictMessage, errs.ErrConflict))
	}
	return fmt.Errorf("%s: %w", op, err)
}
