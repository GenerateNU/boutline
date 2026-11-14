package eventresult

const (
	EventResultMinPageSize     = 1
	EventResultDefaultPageSize = 20
	EventResultMaxPageSize     = 100
)

type EventResultListInput struct {
	ID     string `path:"id" format:"uuid" doc:"Event ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type EventResultResponse struct {
	Place        int              `json:"place" doc:"Shared by tied fencers; the next place skips accordingly"`
	CompetitorID string           `json:"competitor_id" format:"uuid"`
	FirstName    string           `json:"first_name"`
	LastName     string           `json:"last_name"`
	Club         *string          `json:"club" nullable:"true" doc:"Primary club; null when the fencer has none"`
	Rating       string           `json:"rating" enum:"A,B,C,D,E,U"`
	DecidedBy    EventResultStage `json:"decided_by" enum:"pool,direct_elimination" doc:"Stage whose ranking placed this fencer"`
}

type EventResultListBody struct {
	Data   []EventResultResponse `json:"data" doc:"Ordered by place"`
	Total  int64                 `json:"total" doc:"Fencers classified, ignoring the page"`
	Limit  int                   `json:"limit"`
	Offset int                   `json:"offset"`
}

type EventResultListOutput struct {
	Body EventResultListBody
}

func newEventResultResponse(row EventResultRow) EventResultResponse {
	return EventResultResponse{
		Place:        row.Place,
		CompetitorID: row.Competitor.ID.String(),
		FirstName:    row.Competitor.FirstName,
		LastName:     row.Competitor.LastName,
		Club:         row.Competitor.PrimaryClub,
		Rating:       string(row.Competitor.Rating),
		DecidedBy:    row.DecidedBy,
	}
}
