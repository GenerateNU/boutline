package competitor

import (
	"time"

	"boutline/internal/features/event"
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

type Gender string

const (
	GenderF Gender = "F"
	GenderM Gender = "M"
	GenderO Gender = "O" // Other
)

func (g Gender) IsValid() bool {
	return g == GenderF || g == GenderM || g == GenderO
}

type Competitor struct {
	ID      uuid.UUID    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	EventID uuid.UUID    `gorm:"type:uuid;not null;index;uniqueIndex:idx_competitors_event_member_number"`
	Event   *event.Event `gorm:"foreignKey:EventID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
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
	Gender    Gender     `gorm:"type:text;not null;check:chk_competitors_gender,gender IN ('F','M','O')"`
	Birthdate time.Time  `gorm:"type:date;not null"`
	Division  string     `gorm:"type:text;not null"`
	// Rating defaults to U (unrated) for competitors with no classification on file.
	Rating        Rating  `gorm:"type:text;not null;default:U;check:chk_competitors_rating,rating IN ('A','B','C','D','E','U')"`
	RatingYear    *int16  `gorm:"type:smallint;check:chk_competitors_rating_year,rating_year BETWEEN 0 AND 99"`
	PrimaryClub   *string `gorm:"type:text"`
	SecondaryClub *string `gorm:"type:text"`
	MemberNumber  *string `gorm:"type:text;uniqueIndex:idx_competitors_event_member_number"`
	// TODO: Remove Team in favor of PrimaryClub later
	Team      string `gorm:"type:text;not null;default:''"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

func (Competitor) TableName() string {
	return "competitors"
}
