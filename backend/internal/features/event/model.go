package event

import (
	"slices"
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

// The USA Fencing age categories. y8 and open predate the full list and stay valid for
// events that already use them.
const (
	EventAgeCategoryY8            EventAgeCategory = "y8"
	EventAgeCategoryY10           EventAgeCategory = "y10"
	EventAgeCategoryY12           EventAgeCategory = "y12"
	EventAgeCategoryY14           EventAgeCategory = "y14"
	EventAgeCategoryCadet         EventAgeCategory = "cadet"
	EventAgeCategoryJunior        EventAgeCategory = "junior"
	EventAgeCategorySenior        EventAgeCategory = "senior"
	EventAgeCategoryVeteran       EventAgeCategory = "veteran"
	EventAgeCategoryOpen          EventAgeCategory = "open"
	EventAgeCategoryU9            EventAgeCategory = "u9"
	EventAgeCategoryU11           EventAgeCategory = "u11"
	EventAgeCategoryU13           EventAgeCategory = "u13"
	EventAgeCategoryU15           EventAgeCategory = "u15"
	EventAgeCategoryU17           EventAgeCategory = "u17"
	EventAgeCategoryU18           EventAgeCategory = "u18"
	EventAgeCategoryU23           EventAgeCategory = "u23"
	EventAgeCategoryCadetU16      EventAgeCategory = "cadet_u16"
	EventAgeCategoryVeteran40     EventAgeCategory = "veteran_40"
	EventAgeCategoryVeteran40To59 EventAgeCategory = "veteran_40_59"
	EventAgeCategoryVeteranABC    EventAgeCategory = "veteran_abc"
	EventAgeCategoryVeteran50     EventAgeCategory = "veteran_50"
	EventAgeCategoryGrandVeteran  EventAgeCategory = "grand_veteran"
	EventAgeCategoryVeteran60     EventAgeCategory = "veteran_60"
	EventAgeCategoryVeteran70     EventAgeCategory = "veteran_70"
)

var eventAgeCategories = []EventAgeCategory{
	EventAgeCategoryY8,
	EventAgeCategoryY10,
	EventAgeCategoryY12,
	EventAgeCategoryY14,
	EventAgeCategoryCadet,
	EventAgeCategoryJunior,
	EventAgeCategorySenior,
	EventAgeCategoryVeteran,
	EventAgeCategoryOpen,
	EventAgeCategoryU9,
	EventAgeCategoryU11,
	EventAgeCategoryU13,
	EventAgeCategoryU15,
	EventAgeCategoryU17,
	EventAgeCategoryU18,
	EventAgeCategoryU23,
	EventAgeCategoryCadetU16,
	EventAgeCategoryVeteran40,
	EventAgeCategoryVeteran40To59,
	EventAgeCategoryVeteranABC,
	EventAgeCategoryVeteran50,
	EventAgeCategoryGrandVeteran,
	EventAgeCategoryVeteran60,
	EventAgeCategoryVeteran70,
}

func (v EventAgeCategory) IsValid() bool {
	return slices.Contains(eventAgeCategories, v)
}

type EventRatingLimit string

const (
	EventRatingLimitOpen      EventRatingLimit = "open"
	EventRatingLimitDiv1A     EventRatingLimit = "div_1a"
	EventRatingLimitCAndAbove EventRatingLimit = "c_and_above"
	EventRatingLimitBAndUnder EventRatingLimit = "b_and_under"
	EventRatingLimitCAndUnder EventRatingLimit = "c_and_under"
	EventRatingLimitDAndUnder EventRatingLimit = "d_and_under"
	EventRatingLimitEAndUnder EventRatingLimit = "e_and_under"
	EventRatingLimitUnrated   EventRatingLimit = "unrated"
)

func (v EventRatingLimit) IsValid() bool {
	return v == EventRatingLimitOpen ||
		v == EventRatingLimitDiv1A ||
		v == EventRatingLimitCAndAbove ||
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
	AgeCategory  *EventAgeCategory      `gorm:"type:text;check:chk_events_age_category,age_category IN ('y8','y10','y12','y14','cadet','junior','senior','veteran','open','u9','u11','u13','u15','u17','u18','u23','cadet_u16','veteran_40','veteran_40_59','veteran_abc','veteran_50','grand_veteran','veteran_60','veteran_70')"`
	RatingLimit  *EventRatingLimit      `gorm:"type:text;check:chk_events_rating_limit,rating_limit IN ('open','div_1a','c_and_above','b_and_under','c_and_under','d_and_under','e_and_under','unrated')"`
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
