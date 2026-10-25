package competitor

import "time"

type CompetitorResponse struct {
	ID           string    `json:"id" format:"uuid"`
	TournamentID string    `json:"tournamentId,omitempty" format:"uuid"`
	FirstName    string    `json:"firstName"`
	LastName     string    `json:"lastName"`
	Rating       string    `json:"rating" enum:"A,B,C,D,E,U"`
	Team         string    `json:"team"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

func newCompetitorResponse(competitor Competitor) CompetitorResponse {
	// Not every competitor is entered in a tournament yet, so the column is
	// nullable and an untagged competitor reports an empty id.
	tournamentID := ""
	if competitor.TournamentID != nil {
		tournamentID = competitor.TournamentID.String()
	}
	return CompetitorResponse{
		ID:           competitor.ID.String(),
		TournamentID: tournamentID,
		FirstName:    competitor.FirstName,
		LastName:     competitor.LastName,
		Rating:       string(competitor.Rating),
		Team:         competitor.Team,
		CreatedAt:    competitor.CreatedAt,
		UpdatedAt:    competitor.UpdatedAt,
	}
}

type CompetitorIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Competitor ID"`
}

type CompetitorOutput struct {
	Body CompetitorResponse
}

type CompetitorCreateBody struct {
	TournamentID string `json:"tournamentId" format:"uuid" doc:"Tournament the competitor is entered in"`
	FirstName    string `json:"firstName" minLength:"1" maxLength:"120" doc:"Competitor first name"`
	LastName     string `json:"lastName" minLength:"1" maxLength:"120" doc:"Competitor last name"`
	Rating       string `json:"rating,omitempty" enum:"A,B,C,D,E,U" doc:"Rating; defaults to U (unrated)"`
	Team         string `json:"team,omitempty" maxLength:"120" doc:"Club or team; omit if none"`
}

type CompetitorCreateInput struct {
	Body CompetitorCreateBody
}

type CompetitorUpdateBody struct {
	FirstName *string `json:"firstName,omitempty" minLength:"1" maxLength:"120" doc:"Competitor first name"`
	LastName  *string `json:"lastName,omitempty" minLength:"1" maxLength:"120" doc:"Competitor last name"`
	Rating    *string `json:"rating,omitempty" enum:"A,B,C,D,E,U" doc:"Rating"`
	Team      *string `json:"team,omitempty" maxLength:"120" doc:"Club or team; send an empty string to clear it"`
}

type CompetitorUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Competitor ID"`
	Body CompetitorUpdateBody
}

// IDs has no format:"uuid" tag because Huma rejects an empty optional query
// string against that format; an empty value is validated by
// utils.ParseUUIDList only when it is actually set.
type CompetitorListInput struct {
	IDs          string `query:"ids" doc:"Comma-separated competitor IDs; omit to return every competitor"`
	Query        string `query:"q" maxLength:"120" doc:"Fuzzy match term; omit to return every competitor"`
	Limit        int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset       int    `query:"offset" default:"0" minimum:"0"`
	TournamentID string `query:"tournament_id" doc:"Only competitors entered in this tournament"`
	Rating       string `query:"rating" enum:"A,B,C,D,E,U" doc:"Only competitors with this rating"`
	Team         string `query:"team" maxLength:"120" doc:"Only competitors on this team (exact match)"`
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

type TeamResponse struct {
	Name            string `json:"name"`
	CompetitorCount int64  `json:"competitorCount"`
}

type TeamListInput struct {
	TournamentID string `path:"id" format:"uuid" doc:"Tournament ID"`
	Query        string `query:"q" maxLength:"120" doc:"Fuzzy match term; omit to return every club"`
	Limit        int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset       int    `query:"offset" default:"0" minimum:"0"`
}

type TeamListBody struct {
	Data   []TeamResponse `json:"data"`
	Total  int64          `json:"total" doc:"Clubs matching the filter, ignoring the page"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type TeamListOutput struct {
	Body TeamListBody
}
