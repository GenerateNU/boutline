package competitor

import "time"

type CompetitorResponse struct {
	ID        string    `json:"id" format:"uuid"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Rating    string    `json:"rating" enum:"A,B,C,D,E,U"`
	Team      string    `json:"team"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func newCompetitorResponse(competitor Competitor) CompetitorResponse {
	return CompetitorResponse{
		ID:        competitor.ID.String(),
		FirstName: competitor.FirstName,
		LastName:  competitor.LastName,
		Rating:    string(competitor.Rating),
		Team:      competitor.Team,
		CreatedAt: competitor.CreatedAt,
		UpdatedAt: competitor.UpdatedAt,
	}
}

type CompetitorIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Competitor ID"`
}

type CompetitorOutput struct {
	Body CompetitorResponse
}

type CompetitorCreateBody struct {
	FirstName string `json:"firstName" minLength:"1" maxLength:"120" doc:"Competitor first name"`
	LastName  string `json:"lastName" minLength:"1" maxLength:"120" doc:"Competitor last name"`
	Rating    string `json:"rating,omitempty" enum:"A,B,C,D,E,U" doc:"Rating; defaults to U (unrated)"`
	Team      string `json:"team,omitempty" maxLength:"120" doc:"Club or team; omit if none"`
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

type CompetitorListInput struct {
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
	Rating string `query:"rating" enum:"A,B,C,D,E,U" doc:"Only competitors with this rating"`
	Team   string `query:"team" maxLength:"120" doc:"Only competitors on this team (exact match)"`
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
