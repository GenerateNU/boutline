package competitor

import (
	"time"

	"github.com/google/uuid"
)

type Rating string

const (
	RatingA Rating = "A"
	RatingB Rating = "B"
	RatingC Rating = "C"
	RatingD Rating = "D"
	RatingE Rating = "E"
	RatingU Rating = "U" // Unrated
)

func (r Rating) IsValid() bool {
	return r == RatingA ||
		r == RatingB ||
		r == RatingC ||
		r == RatingD ||
		r == RatingE ||
		r == RatingU
}

type Competitor struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	FirstName string    `gorm:"type:text;not null"`
	LastName  string    `gorm:"type:text;not null"`
	// Rating defaults to U (unrated) for competitors with no classification on file.
	Rating    Rating `gorm:"type:text;not null;default:U;check:chk_competitors_rating,rating IN ('A','B','C','D','E','U')"`
	Team      string `gorm:"type:text;not null;default:''"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Competitor) TableName() string {
	return "competitors"
}
