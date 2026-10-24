package competitor

import (
	"time"

	"boutline/internal/features/tournament"
	"boutline/internal/features/user"

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
	ID uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	// Nullable for now: not every competitor is tied to a tournament yet.
	TournamentID *uuid.UUID             `gorm:"type:uuid;index"`
	Tournament   *tournament.Tournament `gorm:"foreignKey:TournamentID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	// The fencer this record belongs to. Nullable: competitors created before
	// ownership existed have no owner, and deleting the account unlinks rather
	// than deletes the record so its results survive.
	UserID    *uuid.UUID `gorm:"type:uuid;index"`
	User      *user.User `gorm:"foreignKey:UserID;references:ID;constraint:OnDelete:SET NULL,OnUpdate:CASCADE"`
	FirstName string     `gorm:"type:text;not null"`
	LastName  string     `gorm:"type:text;not null"`
	// Rating defaults to U (unrated) for competitors with no classification on file.
	Rating    Rating `gorm:"type:text;not null;default:U;check:chk_competitors_rating,rating IN ('A','B','C','D','E','U')"`
	Team      string `gorm:"type:text;not null;default:''"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Competitor) TableName() string {
	return "competitors"
}
