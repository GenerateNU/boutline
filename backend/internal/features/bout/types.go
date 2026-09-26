package bout

import "time"

type BoutResponse struct {
	ID               string     `json:"id" format:"uuid"`
	TournamentID     string     `json:"tournament_id" format:"uuid"`
	RefereeID        string     `json:"referee_id" format:"uuid"`
	Competitor1ID    string     `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string     `json:"competitor_2_id" format:"uuid"`
	Location         *string    `json:"location"`
	Time             *time.Time `json:"time" doc:"Scheduled start; set to the actual start when the bout starts"`
	TimeLimitSeconds *int       `json:"time_limit_seconds"`
	PointsToWin      int        `json:"points_to_win"`
	GroupNumber      int        `json:"group_number"`
	Status           BoutStatus `json:"status" enum:"pending,active,end"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func newBoutResponse(bout Bout) BoutResponse {
	return BoutResponse{
		ID:               bout.ID.String(),
		TournamentID:     bout.TournamentID.String(),
		RefereeID:        bout.RefereeID.String(),
		Competitor1ID:    bout.Competitor1ID.String(),
		Competitor2ID:    bout.Competitor2ID.String(),
		Location:         bout.Location,
		Time:             bout.Time,
		TimeLimitSeconds: bout.TimeLimitSeconds,
		PointsToWin:      bout.PointsToWin,
		GroupNumber:      bout.GroupNumber,
		Status:           bout.Status,
		CreatedAt:        bout.CreatedAt,
		UpdatedAt:        bout.UpdatedAt,
	}
}

type BoutCreateBody struct {
	TournamentID     string     `json:"tournament_id" format:"uuid" doc:"Tournament this bout belongs to"`
	RefereeID        string     `json:"referee_id" format:"uuid"`
	Competitor1ID    string     `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string     `json:"competitor_2_id" format:"uuid"`
	PointsToWin      int        `json:"points_to_win" minimum:"1"`
	Location         *string    `json:"location,omitempty" maxLength:"200"`
	Time             *time.Time `json:"time,omitempty" doc:"Scheduled start"`
	TimeLimitSeconds *int       `json:"time_limit_seconds,omitempty" minimum:"1"`
	GroupNumber      int        `json:"group_number,omitempty" minimum:"0"`
}

type BoutCreateInput struct {
	Body BoutCreateBody
}

type BoutIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Bout ID"`
}

type BoutUpdateBody struct {
	RefereeID        *string    `json:"referee_id,omitempty" format:"uuid"`
	Competitor1ID    *string    `json:"competitor_1_id,omitempty" format:"uuid"`
	Competitor2ID    *string    `json:"competitor_2_id,omitempty" format:"uuid"`
	PointsToWin      *int       `json:"points_to_win,omitempty" minimum:"1"`
	Location         *string    `json:"location,omitempty" maxLength:"200"`
	Time             *time.Time `json:"time,omitempty"`
	TimeLimitSeconds *int       `json:"time_limit_seconds,omitempty" minimum:"1"`
	GroupNumber      *int       `json:"group_number,omitempty" minimum:"0"`
}

type BoutUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Bout ID"`
	Body BoutUpdateBody
}

// TournamentID has no format:"uuid" tag because Huma rejects an empty
// optional query string against that format; an empty value is validated by
// utils.ParseUUID only when it is actually set.
type BoutListInput struct {
	TournamentID string     `query:"tournament_id" doc:"Filter by tournament"`
	Status       BoutStatus `query:"status" enum:"pending,active,end" doc:"Filter by status"`
	Limit        int        `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset       int        `query:"offset" default:"0" minimum:"0"`
}

type BoutOutput struct {
	Body BoutResponse
}

type BoutListBody struct {
	Data   []BoutResponse `json:"data"`
	Total  int64          `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type BoutListOutput struct {
	Body BoutListBody
}
