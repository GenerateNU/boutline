package user

import (
	"time"

	"github.com/google/uuid"
)

// Password holds a hash, never the plaintext the client sent.
type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email     string    `gorm:"type:text;not null;uniqueIndex:idx_users_email"`
	Password  string    `gorm:"type:text;not null"`
	FirstName string    `gorm:"type:text;not null"`
	LastName  string    `gorm:"type:text;not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (User) TableName() string {
	return "users"
}
