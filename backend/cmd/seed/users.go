package main

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/models"
	"boutline/internal/repository"
	"boutline/internal/services"

	"gorm.io/gorm"
)

// Shared by every seeded account, and documented in backend/README.md.
const seedUserPassword = "password123"

type seedUser struct {
	email         string
	firstName     string
	lastName      string
	certification []string
}

// One account without certifications, so the empty-array default is exercised
// by the seed and not only by the tests.
func userFixtures() []seedUser {
	return []seedUser{
		{email: "ada@boutline.test", firstName: "Ada", lastName: "Lovelace", certification: []string{"CPR", "Lifeguard"}},
		{email: "grace@boutline.test", firstName: "Grace", lastName: "Hopper", certification: []string{"First Aid"}},
		{email: "alan@boutline.test", firstName: "Alan", lastName: "Turing"},
	}
}

func seedUsers(ctx context.Context, db *gorm.DB) (Result, error) {
	service := services.NewUserService(repository.NewUserRepository(db))

	var result Result
	for _, fixture := range userFixtures() {
		created, err := seedOneUser(ctx, service, fixture)
		if err != nil {
			return Result{}, err
		}
		if created {
			result.Created++
		} else {
			result.Skipped++
		}
	}

	return result, nil
}

// seedOneUser reports whether it inserted the account. The existence check is
// not a transaction, so a concurrent run could still lose the race — the
// duplicate error from the unique index is the authority, and it counts as
// "already there" rather than a failure.
func seedOneUser(ctx context.Context, service *services.UserService, fixture seedUser) (bool, error) {
	_, err := service.GetUserByEmail(ctx, fixture.email)
	switch {
	case err == nil:
		return false, nil
	case !errors.Is(err, errs.ErrNotFound):
		return false, fmt.Errorf("look up %s: %w", fixture.email, err)
	}

	_, err = service.CreateUser(ctx, models.CreateUserRequest{
		Email:         fixture.email,
		Password:      seedUserPassword,
		FirstName:     fixture.firstName,
		LastName:      fixture.lastName,
		Certification: fixture.certification,
	})
	if err != nil {
		if errors.Is(err, errs.ErrDuplicate) {
			return false, nil
		}
		return false, fmt.Errorf("create %s: %w", fixture.email, err)
	}

	return true, nil
}
