package competitor

import (
	"regexp"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/event"
)

var memberNumberPattern = regexp.MustCompile(`^1\d{8}$`)

func parseMemberNumber(raw string) (string, error) {
	number := strings.TrimSpace(raw)
	if number != "" && !memberNumberPattern.MatchString(number) {
		return "", errs.Public("member number must be 9 digits starting with 1", errs.ErrInvalidInput)
	}
	return number, nil
}

func parseRating(raw string) (Rating, error) {
	rating := Rating(strings.TrimSpace(raw))
	if !rating.IsValid() {
		return "", errs.Public("rating must be one of A, B, C, D, E, or U", errs.ErrInvalidInput)
	}
	return rating, nil
}

func parseGender(raw string) (Gender, error) {
	gender := Gender(strings.TrimSpace(raw))
	if !gender.IsValid() {
		return "", errs.Public("gender must be one of F, M, or O", errs.ErrInvalidInput)
	}
	return gender, nil
}

func parseWeapon(raw string) (event.EventWeapon, error) {
	weapon := event.EventWeapon(strings.TrimSpace(raw))
	if !weapon.IsValid() {
		return "", errs.Public("weapon must be one of foil, epee, or sabre", errs.ErrInvalidInput)
	}
	return weapon, nil
}

func parseAgeCategory(raw string) (event.EventAgeCategory, error) {
	ageCategory := event.EventAgeCategory(strings.TrimSpace(raw))
	if !ageCategory.IsValid() {
		return "", errs.Public("age category is not a known USA Fencing age category", errs.ErrInvalidInput)
	}
	return ageCategory, nil
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

// Treats blank as "not provided" (nil)
func optionalText(raw string) *string {
	value := strings.TrimSpace(raw)
	if value == "" {
		return nil
	}
	return &value
}

// "" is kept; It clears the field)
func trimmed(raw *string) *string {
	if raw == nil {
		return nil
	}
	value := strings.TrimSpace(*raw)
	return &value
}
