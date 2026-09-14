package models

import (
	"time"

	"github.com/google/uuid"
)

// Password holds a bcrypt hash, never a plaintext password, and the struct
// carries no json tags so it cannot be serialised into a response by accident.
type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email     string    `gorm:"type:text;not null;uniqueIndex:idx_users_email"`
	Password  string    `gorm:"type:text;not null"`
	FirstName string    `gorm:"type:text;not null"`
	LastName  *string   `gorm:"type:text"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

// The tags are Huma's, so the schema rejects a bad body before the controller
// runs. Huma treats every field as required unless its json tag says otherwise,
// which is why last_name carries omitempty — a pointer alone is not enough. The
// password bounds repeat services.UserMinPasswordLength/UserMaxPasswordLength
// because struct tags cannot reference a constant; keep the two in sync.
type CreateUserRequest struct {
	Email     string  `json:"email" format:"email"`
	Password  string  `json:"password" minLength:"8" maxLength:"72"`
	FirstName string  `json:"first_name" minLength:"1"`
	LastName  *string `json:"last_name,omitempty" minLength:"1"`
}
