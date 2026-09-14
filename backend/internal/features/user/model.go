// Package user owns the account record: the model, its persistence, and the
// rules for creating one. It has no handler or routes yet — the HTTP surface
// arrives with the auth feature, so the five-file template is collapsed the way
// internal/features/health collapses it.
package user

import (
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// Password holds a bcrypt hash, never a plaintext password, and the struct
// carries no json tags so it cannot be serialised into a response by accident.
type User struct {
	ID            uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email         string         `gorm:"type:text;not null;uniqueIndex:idx_users_email"`
	Password      string         `gorm:"type:text;not null"`
	FirstName     string         `gorm:"type:text;not null"`
	LastName      string         `gorm:"type:text;not null"`
	Certification pq.StringArray `gorm:"type:text[];not null;default:'{}'"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
