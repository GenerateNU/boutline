package models

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

type CreateUserRequest struct {
	Email     string `validate:"required,email" json:"email"`
	Password  string `validate:"required,min=8,max=72" json:"password"`
	FirstName string `validate:"required,min=1" json:"first_name"`
	LastName  string `validate:"required,min=1" json:"last_name"`
	// Empty for a sign-up; the seed and later profile edits are what fill it.
	Certification []string `validate:"omitempty" json:"certification,omitempty"`
}
