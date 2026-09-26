package competitor

import (
	"time"

	"github.com/google/uuid"
)

type Competitor struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	FirstName string    `gorm:"type:text;not null"`
	LastName  string    `gorm:"type:text;null"`
	Rating    string	`gorm:"type:text;not null"`
	Team      string	`gorm:"type:text;null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Competitor) TableName() string {
	return "competitors"
}
