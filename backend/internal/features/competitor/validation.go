package competitor

import (
	"time"

	"boutline/internal/errs"
)

// Input checks shared by create, update, and list. Huma's tags catch these over
// HTTP; these cover callers that don't come through a request.

func parseRating(raw string) (Rating, error) {
	rating := Rating(raw)
	if !rating.IsValid() {
		return "", errs.Public("rating must be one of A, B, C, D, E, or U", errs.ErrInvalidInput)
	}
	return rating, nil
}

func parseBirthdate(raw string) (time.Time, error) {
	birthdate, err := time.Parse(birthdateLayout, raw)
	if err != nil {
		return time.Time{}, errs.Public("birthdate must be a date in YYYY-MM-DD format", errs.ErrInvalidInput)
	}
	if birthdate.After(time.Now()) {
		return time.Time{}, errs.Public("birthdate must not be in the future", errs.ErrInvalidInput)
	}
	return birthdate, nil
}

func validateRatingYear(year *int16) error {
	if year != nil && (*year < 0 || *year > 99) {
		return errs.Public("rating year must be between 0 and 99", errs.ErrInvalidInput)
	}
	return nil
}