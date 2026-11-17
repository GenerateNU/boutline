package event

import (
	"time"

	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

// Format never changes after creation and decides the order of the event's
// stages. The current stage is whichever stage row is active, so it isn't
// stored on the event.
type EventFormat string

const (
	EventFormatPoolThenDirectElimination EventFormat = "pool_then_direct_elimination"
)

type EventStatus string

const (
	EventStatusUpcoming EventStatus = "upcoming"
	EventStatusActive   EventStatus = "active"
	EventStatusEnded    EventStatus = "ended"
)

func (s EventStatus) IsValid() bool {
	return s == EventStatusUpcoming ||
		s == EventStatusActive ||
		s == EventStatusEnded
}

type EventType string

const (
	EventTypeIndividual EventType = "individual"
	EventTypeTeam       EventType = "team"
)

func (v EventType) IsValid() bool {
	return v == EventTypeIndividual ||
		v == EventTypeTeam
}

type EventWeapon string

const (
	EventWeaponFoil  EventWeapon = "foil"
	EventWeaponEpee  EventWeapon = "epee"
	EventWeaponSabre EventWeapon = "sabre"
)

func (v EventWeapon) IsValid() bool {
	return v == EventWeaponFoil ||
		v == EventWeaponEpee ||
		v == EventWeaponSabre
}

type EventGender string

const (
	EventGenderMale   EventGender = "male"
	EventGenderFemale EventGender = "female"
	EventGenderOther  EventGender = "other"
)

func (v EventGender) IsValid() bool {
	return v == EventGenderMale ||
		v == EventGenderFemale ||
		v == EventGenderOther
}

type EventAgeCategory string

const (
	EventAgeCategoryY8      EventAgeCategory = "y8"
	EventAgeCategoryY10     EventAgeCategory = "y10"
	EventAgeCategoryY12     EventAgeCategory = "y12"
	EventAgeCategoryY14     EventAgeCategory = "y14"
	EventAgeCategoryCadet   EventAgeCategory = "cadet"
	EventAgeCategoryJunior  EventAgeCategory = "junior"
	EventAgeCategorySenior  EventAgeCategory = "senior"
	EventAgeCategoryVeteran EventAgeCategory = "veteran"
	EventAgeCategoryOpen    EventAgeCategory = "open"
)

func (v EventAgeCategory) IsValid() bool {
	return v == EventAgeCategoryY8 ||
		v == EventAgeCategoryY10 ||
		v == EventAgeCategoryY12 ||
		v == EventAgeCategoryY14 ||
		v == EventAgeCategoryCadet ||
		v == EventAgeCategoryJunior ||
		v == EventAgeCategorySenior ||
		v == EventAgeCategoryVeteran ||
		v == EventAgeCategoryOpen
}

type EventRatingLimit string

const (
	EventRatingLimitOpen      EventRatingLimit = "open"
	EventRatingLimitBAndUnder EventRatingLimit = "b_and_under"
	EventRatingLimitCAndUnder EventRatingLimit = "c_and_under"
	EventRatingLimitDAndUnder EventRatingLimit = "d_and_under"
	EventRatingLimitEAndUnder EventRatingLimit = "e_and_under"
	EventRatingLimitUnrated   EventRatingLimit = "unrated"
)

func (v EventRatingLimit) IsValid() bool {
	return v == EventRatingLimitOpen ||
		v == EventRatingLimitBAndUnder ||
		v == EventRatingLimitCAndUnder ||
		v == EventRatingLimitDAndUnder ||
		v == EventRatingLimitEAndUnder ||
		v == EventRatingLimitUnrated
}

func EventEditableStatuses() []EventStatus {
	return []EventStatus{EventStatusUpcoming}
}

func EventDeletableStatuses() []EventStatus {
	return []EventStatus{EventStatusUpcoming}
}

type Event struct {
	ID           uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TournamentID uuid.UUID              `gorm:"type:uuid;not null;index"`
	Tournament   *tournament.Tournament `gorm:"foreignKey:TournamentID;references:ID;constraint:OnDelete:CASCADE,OnUpdate:CASCADE"`
	Format       EventFormat            `gorm:"type:text;not null;default:pool_then_direct_elimination;check:chk_events_format,format IN ('pool_then_direct_elimination')"`
	Name         string                 `gorm:"type:text;not null"`
	Status       EventStatus            `gorm:"type:text;not null;default:upcoming;check:chk_events_status,status IN ('upcoming','active','ended')"`
	Type         *EventType             `gorm:"type:text;check:chk_events_type,type IN ('individual','team')"`
	Weapon       *EventWeapon           `gorm:"type:text;check:chk_events_weapon,weapon IN ('foil','epee','sabre')"`
	Gender       *EventGender           `gorm:"type:text;check:chk_events_gender,gender IN ('male','female','other')"`
	AgeCategory  *EventAgeCategory      `gorm:"type:text;check:chk_events_age_category,age_category IN ('y8','y10','y12','y14','cadet','junior','senior','veteran','open')"`
	RatingLimit  *EventRatingLimit      `gorm:"type:text;check:chk_events_rating_limit,rating_limit IN ('open','b_and_under','c_and_under','d_and_under','e_and_under','unrated')"`
	Qualifier    bool                   `gorm:"not null;default:false"`
	StartTime    *time.Time
	StartedAt    *time.Time
	CompletedAt  *time.Time
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (Event) TableName() string {
	return "events"
}
