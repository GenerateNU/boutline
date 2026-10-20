package competitor

import "time"

const birthdateLayout = time.DateOnly

type CompetitorResponse struct {
	ID            string    `json:"id" format:"uuid"`
	EventID       string    `json:"eventId" format:"uuid"`
	FirstName     string    `json:"firstName"`
	LastName      string    `json:"lastName"`
	Gender        string    `json:"gender" enum:"F,M,O"`
	Birthdate     string    `json:"birthdate" format:"date"`
	Division      string    `json:"division"`
	Rating        string    `json:"rating" enum:"A,B,C,D,E,U"`
	RatingYear    *int16    `json:"ratingYear" nullable:"true"`
	PrimaryClub   *string   `json:"primaryClub" nullable:"true"`
	SecondaryClub *string   `json:"secondaryClub" nullable:"true"`
	MemberNumber  *string   `json:"memberNumber" nullable:"true"`
	Team          string    `json:"team"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func newCompetitorResponse(competitor Competitor) CompetitorResponse {
	return CompetitorResponse{
		ID:            competitor.ID.String(),
		EventID:       competitor.EventID.String(),
		FirstName:     competitor.FirstName,
		LastName:      competitor.LastName,
		Gender:        string(competitor.Gender),
		Birthdate:     competitor.Birthdate.Format(birthdateLayout),
		Division:      competitor.Division,
		Rating:        string(competitor.Rating),
		RatingYear:    competitor.RatingYear,
		PrimaryClub:   competitor.PrimaryClub,
		SecondaryClub: competitor.SecondaryClub,
		MemberNumber:  competitor.MemberNumber,
		Team:          competitor.Team,
		CreatedAt:     competitor.CreatedAt,
		UpdatedAt:     competitor.UpdatedAt,
	}
}

type CompetitorIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Competitor ID"`
}

type CompetitorOutput struct {
	Body CompetitorResponse
}

type CompetitorCreateBody struct {
	EventID   string `json:"eventId" format:"uuid" doc:"Event this competitor is entered in"`
	FirstName string `json:"firstName" minLength:"1" maxLength:"120" doc:"Competitor first name"`
	LastName  string `json:"lastName" minLength:"1" maxLength:"120" doc:"Competitor last name"`
	Gender    string `json:"gender" enum:"F,M,O" doc:"F, M, or O (other)"`
	Birthdate string `json:"birthdate" format:"date" doc:"Birthdate as YYYY-MM-DD"`
	Division  string `json:"division" minLength:"1" maxLength:"120" doc:"Home state"`

	Rating     string `json:"rating,omitempty" enum:"A,B,C,D,E,U" doc:"Rating; defaults to U (unrated)"`
	RatingYear *int16 `json:"ratingYear,omitempty" minimum:"0" maximum:"99" doc:"Year the rating was earned"`

	PrimaryClub   string `json:"primaryClub,omitempty" maxLength:"120" doc:"Primary club; omit if none"`
	SecondaryClub string `json:"secondaryClub,omitempty" maxLength:"120" doc:"Secondary club; omit if none"`
	MemberNumber  string `json:"memberNumber,omitempty" maxLength:"64" doc:"Member number; unique within an event"`

	Team string `json:"team,omitempty" maxLength:"120" doc:"Deprecated: use primaryClub"`
}

type CompetitorCreateInput struct {
	Body CompetitorCreateBody
}

type CompetitorUpdateBody struct {
	FirstName *string `json:"firstName,omitempty" minLength:"1" maxLength:"120" doc:"Competitor first name"`
	LastName  *string `json:"lastName,omitempty" minLength:"1" maxLength:"120" doc:"Competitor last name"`
	Gender    *string `json:"gender,omitempty" enum:"F,M,O" doc:"F, M, or O (other)"`
	Birthdate *string `json:"birthdate,omitempty" format:"date" doc:"Birthdate as YYYY-MM-DD"`
	Division  *string `json:"division,omitempty" minLength:"1" maxLength:"120" doc:"Home state"`

	Rating     *string `json:"rating,omitempty" enum:"A,B,C,D,E,U" doc:"Rating"`
	RatingYear *int16  `json:"ratingYear,omitempty" minimum:"0" maximum:"99" doc:"Year the rating was earned"`

	PrimaryClub   *string `json:"primaryClub,omitempty" maxLength:"120" doc:"Primary club; send an empty string to clear it"`
	SecondaryClub *string `json:"secondaryClub,omitempty" maxLength:"120" doc:"Secondary club; send an empty string to clear it"`
	MemberNumber  *string `json:"memberNumber,omitempty" maxLength:"64" doc:"Member number; send an empty string to clear it"`

	Team *string `json:"team,omitempty" maxLength:"120" doc:"Deprecated: use primaryClub"`
}

type CompetitorUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Competitor ID"`
	Body CompetitorUpdateBody
}

type CompetitorListInput struct {
	Query   string `query:"q" maxLength:"120" doc:"Fuzzy match term; omit to return every competitor"`
	Limit   int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset  int    `query:"offset" default:"0" minimum:"0"`
	EventID string `query:"eventId" format:"uuid" doc:"Only competitors in this event"`
	Rating  string `query:"rating" enum:"A,B,C,D,E,U" doc:"Only competitors with this rating"`
	Team    string `query:"team" maxLength:"120" doc:"Only competitors on this team (exact match)"`
}

type CompetitorListBody struct {
	Data   []CompetitorResponse `json:"data"`
	Total  int64                `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int                  `json:"limit"`
	Offset int                  `json:"offset"`
}

type CompetitorListOutput struct {
	Body CompetitorListBody
}

type TeamListResult struct {
	Team            string `json:"team"`
	CompetitorCount int64  `json:"competitorCount" doc:"Competitors on this team"`
}

type CompetitorTeamListInput struct {
	Query        string `query:"q" maxLength:"120" doc:"Fuzzy match term; omit to return every team"`
	TournamentID string `query:"tournament_id" format:"uuid" doc:"Only teams with a competitor in this tournament"`
	Limit        int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset       int    `query:"offset" default:"0" minimum:"0"`
}

type CompetitorTeamListBody struct {
	Data   []TeamListResult `json:"data"`
	Total  int64            `json:"total" doc:"Distinct teams matching the term, ignoring the page"`
	Limit  int              `json:"limit"`
	Offset int              `json:"offset"`
}

type CompetitorTeamListOutput struct {
	Body CompetitorTeamListBody
}
