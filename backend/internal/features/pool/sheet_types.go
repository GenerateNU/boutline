package pool

import (
	"time"

	"github.com/google/uuid"
)

type PoolSheetListInput struct {
	// No format:"uuid": like the other list filters, a bad id is a 400 from utils.ParseUUID rather than Huma's 422.
	EventID string `query:"event_id" doc:"Event whose pools to list; required unless ids is given"`
	IDs     string `query:"ids" doc:"Comma-separated pool IDs, such as a viewer's pinned pools; required unless event_id is given"`
	Limit   int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset  int    `query:"offset" default:"0" minimum:"0"`
}

type PoolSheetIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Pool ID"`
}

type PoolStanding struct {
	Place           int     `json:"place" doc:"Shared by fencers tied on victory ratio, indicator, and touches scored"`
	Victories       int     `json:"victories"`
	Matches         int     `json:"matches" doc:"Ended bouts fenced"`
	VictoryRatio    float64 `json:"victory_ratio"`
	TouchesScored   int     `json:"touches_scored"`
	TouchesReceived int     `json:"touches_received"`
	Indicator       int     `json:"indicator" doc:"touches_scored minus touches_received"`
}

type PoolSheetFencer struct {
	CompetitorID string       `json:"competitor_id" format:"uuid"`
	Position     int          `json:"position" doc:"Row and column in the pool grid, from 1, in registration order (competitor created_at, then id)"`
	FirstName    string       `json:"first_name"`
	LastName     string       `json:"last_name"`
	Team         string       `json:"team"`
	Standing     PoolStanding `json:"standing"`
}

type PoolSheetBout struct {
	ID               string     `json:"id" format:"uuid"`
	Slot             int        `json:"slot" doc:"Position in the pool's bout order, from 1"`
	Status           string     `json:"status" enum:"upcoming,active,ended"`
	Competitor1ID    string     `json:"competitor_1_id" format:"uuid"`
	Competitor2ID    string     `json:"competitor_2_id" format:"uuid"`
	Competitor1Score int        `json:"competitor_1_score" doc:"Sum of non-revoked touches"`
	Competitor2Score int        `json:"competitor_2_score" doc:"Sum of non-revoked touches"`
	WinnerID         *string    `json:"winner_id" format:"uuid" doc:"Null until the bout ends, and for a tied score"`
	Location         *string    `json:"location"`
	StartTime        *time.Time `json:"start_time"`
}

type PoolSheetResponse struct {
	ID          string            `json:"id" format:"uuid"`
	PoolStageID string            `json:"pool_stage_id" format:"uuid"`
	Number      int               `json:"number"`
	Strip       *string           `json:"strip"`
	Status      PoolSheetStatus   `json:"status" enum:"upcoming,active,ended" doc:"Derived from started_at and completed_at"`
	StartTime   *time.Time        `json:"start_time" doc:"Scheduled start"`
	StartedAt   *time.Time        `json:"started_at"`
	CompletedAt *time.Time        `json:"completed_at"`
	Fencers     []PoolSheetFencer `json:"fencers" doc:"Ordered by position"`
	Bouts       []PoolSheetBout   `json:"bouts" doc:"Ordered by slot"`
}

type PoolSheetOutput struct {
	Body PoolSheetResponse
}

type PoolSheetListBody struct {
	Data   []PoolSheetResponse `json:"data"`
	Total  int64               `json:"total" doc:"Pools in the event, ignoring the page"`
	Limit  int                 `json:"limit"`
	Offset int                 `json:"offset"`
}

type PoolSheetListOutput struct {
	Body PoolSheetListBody
}

func newPoolSheetResponse(pool PoolSheetPoolRow, fencers []PoolSheetFencerRow, bouts []PoolSheetBoutRow) PoolSheetResponse {
	standings := poolStandings(fencers, bouts)

	wireFencers := make([]PoolSheetFencer, 0, len(fencers))
	for _, fencer := range fencers {
		wireFencers = append(wireFencers, PoolSheetFencer{
			CompetitorID: fencer.CompetitorID.String(),
			Position:     fencer.Position,
			FirstName:    fencer.FirstName,
			LastName:     fencer.LastName,
			Team:         fencer.Team,
			Standing:     standings[fencer.CompetitorID],
		})
	}

	wireBouts := make([]PoolSheetBout, 0, len(bouts))
	for _, bout := range bouts {
		wireBouts = append(wireBouts, PoolSheetBout{
			ID:               bout.ID.String(),
			Slot:             bout.Slot,
			Status:           bout.Status,
			Competitor1ID:    bout.Competitor1ID.String(),
			Competitor2ID:    bout.Competitor2ID.String(),
			Competitor1Score: bout.Competitor1Score,
			Competitor2Score: bout.Competitor2Score,
			WinnerID:         optionalUUIDString(poolSheetWinnerID(bout)),
			Location:         bout.Location,
			StartTime:        bout.StartTime,
		})
	}

	return PoolSheetResponse{
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
