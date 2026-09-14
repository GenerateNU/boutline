// Package mocks holds hand-written in-memory stand-ins for the repository
// interfaces, so service tests can reach the error paths the database would
// otherwise produce without needing a database.
package mocks

import (
	"context"
	"fmt"
	"sync"
	"time"

	"boutline/internal/errs"
	"boutline/internal/models"
	"boutline/internal/repository"

	"github.com/google/uuid"
)

// MockUserRepository enforces the same unique-email constraint the real
// repository gets from Postgres and fills the id and timestamps that gorm would
// read back from the column defaults. One instance is shared across parallel
// subtests, hence the mutex.
type MockUserRepository struct {
	mu   sync.RWMutex
	rows map[uuid.UUID]models.User
}

var _ repository.UserRepository = (*MockUserRepository)(nil)

func NewMockUserRepository(seed ...models.User) *MockUserRepository {
	rows := make(map[uuid.UUID]models.User, len(seed))
	for _, u := range seed {
		if u.ID == uuid.Nil {
			u.ID = uuid.New()
		}
		rows[u.ID] = u
	}

	return &MockUserRepository{rows: rows}
}

func (m *MockUserRepository) CreateUser(_ context.Context, u *models.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, existing := range m.rows {
		if existing.Email == u.Email {
			return fmt.Errorf("create user: %w", errs.ErrDuplicate)
		}
	}

	now := time.Now()
	u.ID = uuid.New()
	u.CreatedAt = now
	u.UpdatedAt = now
	m.rows[u.ID] = *u

	return nil
}
