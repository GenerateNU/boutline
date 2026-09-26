package match

import "time"

type MatchResponse struct {
	ID               string      `json:"id" format:"uuid"`
	TournamentID     string      `json:"tournament_id" format:"uuid"`
	RefereeID        string      `json:"referee_id" format:"uuid"`
	Competitor1ID    string      `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string      `json:"competitor_2_id" format:"uuid"`
	Location         *string     `json:"location"`
	Time             *time.Time  `json:"time" doc:"Scheduled start; set to the actual start when the match starts"`
	TimeLimitSeconds *int        `json:"time_limit_seconds"`
	PointsToWin      int         `json:"points_to_win"`
	GroupNumber      int         `json:"group_number"`
	Status           MatchStatus `json:"status" enum:"pending,active,end"`
	CreatedAt        time.Time   `json:"created_at"`
	UpdatedAt        time.Time   `json:"updated_at"`
}

func newMatchResponse(match Match) MatchResponse {
	return MatchResponse{
		ID:               match.ID.String(),
		TournamentID:     match.TournamentID.String(),
		RefereeID:        match.RefereeID.String(),
		Competitor1ID:    match.Competitor1ID.String(),
		Competitor2ID:    match.Competitor2ID.String(),
		Location:         match.Location,
		Time:             match.Time,
		TimeLimitSeconds: match.TimeLimitSeconds,
		PointsToWin:      match.PointsToWin,
		GroupNumber:      match.GroupNumber,
		Status:           match.Status,
		CreatedAt:        match.CreatedAt,
		UpdatedAt:        match.UpdatedAt,
	}
}

type MatchCreateBody struct {
	TournamentID     string     `json:"tournament_id" format:"uuid" doc:"Tournament this match belongs to"`
	RefereeID        string     `json:"referee_id" format:"uuid"`
	Competitor1ID    string     `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string     `json:"competitor_2_id" format:"uuid"`
	PointsToWin      int        `json:"points_to_win" minimum:"1"`
	Location         *string    `json:"location,omitempty" maxLength:"200"`
	Time             *time.Time `json:"time,omitempty" doc:"Scheduled start"`
	TimeLimitSeconds *int       `json:"time_limit_seconds,omitempty" minimum:"1"`
	GroupNumber      int        `json:"group_number,omitempty" minimum:"0"`
}

type MatchCreateInput struct {
	Body MatchCreateBody
}

type MatchIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Match ID"`
}

type MatchUpdateBody struct {
	RefereeID        *string    `json:"referee_id,omitempty" format:"uuid"`
	Competitor1ID    *string    `json:"competitor_1_id,omitempty" format:"uuid"`
	Competitor2ID    *string    `json:"competitor_2_id,omitempty" format:"uuid"`
	PointsToWin      *int       `json:"points_to_win,omitempty" minimum:"1"`
	Location         *string    `json:"location,omitempty" maxLength:"200"`
	Time             *time.Time `json:"time,omitempty"`
	TimeLimitSeconds *int       `json:"time_limit_seconds,omitempty" minimum:"1"`
	GroupNumber      *int       `json:"group_number,omitempty" minimum:"0"`
}

type MatchUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Match ID"`
	Body MatchUpdateBody
}

// TournamentID has no format:"uuid" tag because Huma rejects an empty
// optional query string against that format; an empty value is validated by
// utils.ParseUUID only when it is actually set.
type MatchListInput struct {
	TournamentID string      `query:"tournament_id" doc:"Filter by tournament"`
	Status       MatchStatus `query:"status" enum:"pending,active,end" doc:"Filter by status"`
	Limit        int         `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset       int         `query:"offset" default:"0" minimum:"0"`
}

type MatchOutput struct {
	Body MatchResponse
}

type MatchListBody struct {
	Data   []MatchResponse `json:"data"`
	Total  int64           `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int             `json:"limit"`
	Offset int             `json:"offset"`
}

type MatchListOutput struct {
	Body MatchListBody
}
