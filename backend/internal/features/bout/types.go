package bout

import (
	"time"

	"github.com/google/uuid"
)

type BoutResponse struct {
	ID               string     `json:"id" format:"uuid"`
	TournamentID     string     `json:"tournament_id" format:"uuid"`
	RefereeID        *string    `json:"referee_id" format:"uuid" doc:"Null until a referee is assigned"`
	PoolID           *string    `json:"pool_id" format:"uuid" doc:"Null for a bout outside the pool stage"`
	Slot             *int       `json:"slot" doc:"1-based position in its pool's bout order or its tableau round; null for a bout in neither"`
	Competitor1ID    string     `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string     `json:"competitor_2_id" format:"uuid"`
	Location         *string    `json:"location"`
	StartTime        *time.Time `json:"start_time" doc:"Scheduled start, if one was set"`
	StartedAt        *time.Time `json:"started_at" doc:"When the bout actually went active"`
	CompletedAt      *time.Time `json:"completed_at"`
	TimeLimitSeconds *int       `json:"time_limit_seconds"`
	PointsToWin      int        `json:"points_to_win"`
	GroupNumber      int        `json:"group_number"`
	Status           BoutStatus `json:"status" enum:"upcoming,active,ended"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func newBoutResponse(bout Bout) BoutResponse {
	return BoutResponse{
		ID:               bout.ID.String(),
		TournamentID:     bout.TournamentID.String(),
		RefereeID:        optionalUUIDString(bout.RefereeID),
		PoolID:           optionalUUIDString(bout.PoolID),
		Slot:             bout.Slot,
		Competitor1ID:    bout.Competitor1ID.String(),
		Competitor2ID:    bout.Competitor2ID.String(),
		Location:         bout.Location,
		StartTime:        bout.StartTime,
		StartedAt:        bout.StartedAt,
		CompletedAt:      bout.CompletedAt,
		TimeLimitSeconds: bout.TimeLimitSeconds,
		PointsToWin:      bout.PointsToWin,
		GroupNumber:      bout.GroupNumber,
		Status:           bout.Status,
		CreatedAt:        bout.CreatedAt,
		UpdatedAt:        bout.UpdatedAt,
	}
}

func optionalUUIDString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}

	formatted := id.String()
	return &formatted
}

type BoutCreateBody struct {
	TournamentID     string     `json:"tournament_id" format:"uuid" doc:"Tournament this bout belongs to"`
	RefereeID        *string    `json:"referee_id,omitempty" format:"uuid" doc:"Can be assigned later, but a bout needs one to start"`
	PoolID           *string    `json:"pool_id,omitempty" format:"uuid" doc:"Pool this bout is fought in, if any"`
	Competitor1ID    string     `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string     `json:"competitor_2_id" format:"uuid"`
	PointsToWin      int        `json:"points_to_win" minimum:"1"`
	Location         *string    `json:"location,omitempty" maxLength:"200"`
	StartTime        *time.Time `json:"start_time,omitempty" doc:"Scheduled start"`
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
	StartTime        *time.Time `json:"start_time,omitempty" doc:"New scheduled start"`
	TimeLimitSeconds *int       `json:"time_limit_seconds,omitempty" minimum:"1"`
	GroupNumber      *int       `json:"group_number,omitempty" minimum:"0"`
}

type BoutUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Bout ID"`
	Body BoutUpdateBody
}

// TournamentID, PoolID, and IDs have no format:"uuid" tag because Huma rejects an
// empty optional query string against that format; an empty value is validated by
// utils.ParseUUID or utils.ParseUUIDList only when it is actually set.
type BoutListInput struct {
	TournamentID string     `query:"tournament_id" doc:"Filter by tournament"`
	PoolID       string     `query:"pool_id" doc:"Filter by pool"`
	IDs          string     `query:"ids" doc:"Comma-separated bout IDs; omit to return every bout"`
	Status       BoutStatus `query:"status" enum:"upcoming,active,ended" doc:"Filter by status"`
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

type CompetitorBoutsInput struct {
	ID string `path:"id" format:"uuid" doc:"Competitor ID"`
}

type OpponentResponse struct {
	ID        string `json:"id" format:"uuid"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

// CompetitorBoutResponse is one bout from the competitor's side: Score is theirs
// and OpponentScore the other fencer's.
type CompetitorBoutResponse struct {
	ID            string           `json:"id" format:"uuid"`
	Status        BoutStatus       `json:"status" enum:"upcoming,active,ended"`
	PoolNumber    *int             `json:"pool_number" doc:"Set for a pool bout"`
	RoundSize     *int             `json:"round_size" doc:"Set for a tableau bout: 8 for the table of 8, 2 for the final"`
	Slot          *int             `json:"slot"`
	Opponent      OpponentResponse `json:"opponent"`
	Score         *int             `json:"score" doc:"Null until the bout starts"`
	OpponentScore *int             `json:"opponent_score" doc:"Null until the bout starts"`
}

type CompetitorBoutsBody struct {
	Data []CompetitorBoutResponse `json:"data"`
}

type CompetitorBoutsOutput struct {
	Body CompetitorBoutsBody
}

func newCompetitorBoutResponse(row CompetitorBoutRow) CompetitorBoutResponse {
	resp := CompetitorBoutResponse{
		ID:         row.ID.String(),
		Status:     row.Status,
		PoolNumber: row.PoolNumber,
		RoundSize:  row.RoundSize,
		Slot:       row.Slot,
		Opponent: OpponentResponse{
			ID: row.OpponentID.String(), FirstName: row.OpponentFirstName, LastName: row.OpponentLastName,
		},
	}
	if row.Status != BoutStatusUpcoming {
		score, opponentScore := row.Score, row.OpponentScore
		resp.Score, resp.OpponentScore = &score, &opponentScore
	}

	return resp
}
