package user

import (
	"errors"
	"fmt"

	"boutline/internal/errs"

	"golang.org/x/crypto/bcrypt"
)

// dummyPasswordHash is a bcrypt hash of a random throwaway string, never a
// real user's password. Login compares against it when the email is unknown
// so the response takes the same time whether or not the email exists.
const dummyPasswordHash = "$2a$10$BvA5cbJFKKsbEK7w6CSxeeAjdG9/A.8z/l5ljcAivmEY7kitMcUv."

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

func passwordMatches(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
