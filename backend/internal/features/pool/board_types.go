package pool

import (
	"time"

	"github.com/google/uuid"
)

type PoolBoardListInput struct {
	// No format:"uuid": like the other list filters, a bad id is a 400 from utils.ParseUUID rather than Huma's 422.
	EventID string `query:"event_id" doc:"Event whose pools to list; required unless ids is given"`
	IDs     string `query:"ids" doc:"Comma-separated pool IDs, such as a viewer's pinned pools; required unless event_id is given"`
	Limit   int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset  int    `query:"offset" default:"0" minimum:"0"`
}

type PoolBoardIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Pool ID"`
}

type PoolBoardStanding struct {
	Place           int     `json:"place" doc:"Shared by fencers tied on victory ratio, indicator, and touches scored"`
	Victories       int     `json:"victories"`
	Matches         int     `json:"matches" doc:"Ended bouts fenced"`
	VictoryRatio    float64 `json:"victory_ratio"`
	TouchesScored   int     `json:"touches_scored"`
	TouchesReceived int     `json:"touches_received"`
	Indicator       int     `json:"indicator" doc:"touches_scored minus touches_received"`
}

type PoolBoardFencer struct {
	CompetitorID string            `json:"competitor_id" format:"uuid"`
	Position     int               `json:"position" doc:"Row and column in the pool grid, from 1, in registration order (competitor created_at, then id)"`
	FirstName    string            `json:"first_name"`
	LastName     string            `json:"last_name"`
	Team         string            `json:"team"`
	Standing     PoolBoardStanding `json:"standing"`
}

type PoolBoardBout struct {
	ID               string     `json:"id" format:"uuid"`
	GroupSlot        *int       `json:"group_slot" doc:"Slot in the pool's bout order, from 1; null for a bout added by hand"`
	Status           string     `json:"status" enum:"upcoming,active,ended"`
	Competitor1ID    string     `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string     `json:"competitor_2_id" format:"uuid"`
	Competitor1Score int        `json:"competitor_1_score" doc:"Sum of non-revoked touches"`
	Competitor2Score int        `json:"competitor_2_score" doc:"Sum of non-revoked touches"`
	WinnerID         *string    `json:"winner_id" format:"uuid" doc:"Null until the bout ends, and for a tied score"`
	Location         *string    `json:"location"`
	StartTime        *time.Time `json:"start_time"`
}

type PoolBoardResponse struct {
	ID          string            `json:"id" format:"uuid"`
	PoolStageID string            `json:"pool_stage_id" format:"uuid"`
	Number      int               `json:"number"`
	Strip       *string           `json:"strip"`
	Status      PoolBoardStatus   `json:"status" enum:"upcoming,active,ended" doc:"Derived from started_at and completed_at"`
	StartTime   *time.Time        `json:"start_time" doc:"Scheduled start"`
	StartedAt   *time.Time        `json:"started_at"`
	CompletedAt *time.Time        `json:"completed_at"`
	Fencers     []PoolBoardFencer `json:"fencers" doc:"Ordered by position"`
	Bouts       []PoolBoardBout   `json:"bouts" doc:"Ordered by group_slot, then scheduled start"`
}

type PoolBoardOutput struct {
	Body PoolBoardResponse
}

type PoolBoardListBody struct {
	Data   []PoolBoardResponse `json:"data"`
	Total  int64               `json:"total" doc:"Pools in the event, ignoring the page"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
}

type PoolBoardListOutput struct {
	Body PoolBoardListBody
}

func newPoolBoardResponse(pool PoolBoardPoolRow, fencers []PoolBoardFencerRow, bouts []PoolBoardBoutRow) PoolBoardResponse {
	standings := poolBoardStandings(fencers, bouts)

	wireFencers := make([]PoolBoardFencer, 0, len(fencers))
	for _, fencer := range fencers {
		wireFencers = append(wireFencers, PoolBoardFencer{
			CompetitorID: fencer.CompetitorID.String(),
			Position:     fencer.Position,
			FirstName:    fencer.FirstName,
			LastName:     fencer.LastName,
			Team:         fencer.Team,
			Standing:     standings[fencer.CompetitorID],
		})
	}

	wireBouts := make([]PoolBoardBout, 0, len(bouts))
	for _, bout := range bouts {
		wireBouts = append(wireBouts, PoolBoardBout{
			ID:               bout.ID.String(),
			GroupSlot:        bout.GroupSlot,
			Status:           bout.Status,
			Competitor1ID:    bout.Competitor1ID.String(),
			Competitor2ID:    bout.Competitor2ID.String(),
			Competitor1Score: bout.Competitor1Score,
			Competitor2Score: bout.Competitor2Score,
			WinnerID:         optionalUUIDString(poolBoardWinnerID(bout)),
			Location:         bout.Location,
			StartTime:        bout.StartTime,
		})
	}

	return PoolBoardResponse{
		ID:          pool.ID.String(),
		PoolStageID: pool.PoolStageID.String(),
		Number:      pool.Number,
		Strip:       pool.Strip,
		Status:      pool.Status(),
		StartTime:   pool.StartTime,
		StartedAt:   pool.StartedAt,
		CompletedAt: pool.CompletedAt,
		Fencers:     wireFencers,
		Bouts:       wireBouts,
	}
}

func optionalUUIDString(id *uuid.UUID) *string {
	if id == nil {
		return nil
	}

	s := id.String()

	return &s
}
