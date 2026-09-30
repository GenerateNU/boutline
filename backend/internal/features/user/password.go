package user

import (
	"errors"
	"fmt"

	"boutline/internal/errs"

	"golang.org/x/crypto/bcrypt"
)

func hashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		if errors.Is(err, bcrypt.ErrPasswordTooLong) {
			return "", fmt.Errorf("hash password: %w", errs.Public("password must be at most 72 bytes", errs.ErrInvalidInput))
		}

		return "", fmt.Errorf("hash password: %w", err)
	}

	return string(hashed), nil
}
