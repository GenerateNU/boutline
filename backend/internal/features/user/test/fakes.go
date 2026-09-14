// Package test holds the user feature's unit tests plus the fake repository
// they run against, per the feature test folder pattern in backend/README.md.
package test

import (
	"context"
	"sync"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/user"

	"github.com/google/uuid"
)

// FakeUserRepository stands in for Postgres: it enforces the same unique email
// constraint and not-found semantics the real repository gets from the
// database, so the service's error paths are reachable without a DB.
type FakeUserRepository struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]user.User
}

var _ user.UserRepository = (*FakeUserRepository)(nil)

func NewFakeUserRepository(seed ...user.User) *FakeUserRepository {
	rows := make(map[uuid.UUID]user.User, len(seed))
	for _, u := range seed {
		if u.ID == uuid.Nil {
			u.ID = uuid.New()
		}
		rows[u.ID] = u
	}
	return &FakeUserRepository{rows: rows}
}

func (f *FakeUserRepository) CreateUser(_ context.Context, u *user.User) error {
	f.mu.Lock()
	defer f.mu.Unlock()

	for _, existing := range f.rows {
		if existing.Email == u.Email {
			return errs.ErrDuplicate
		}
	}

	now := time.Now()
	u.ID = uuid.New()
	u.CreatedAt = now
	u.UpdatedAt = now
	f.rows[u.ID] = *u
	return nil
}

func (f *FakeUserRepository) FindUserByEmail(_ context.Context, email string) (*user.User, error) {
	f.mu.RLock()
	defer f.mu.RUnlock()

	for _, row := range f.rows {
		if row.Email == email {
			found := row
			return &found, nil
		}
	}
	return nil, errs.ErrNotFound
}
