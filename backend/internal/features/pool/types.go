package pool

import "time"

type PoolResponse struct {
	ID          string     `json:"id" format:"uuid"`
	PoolStageID string     `json:"pool_stage_id" format:"uuid"`
	RefereeID   *string    `json:"referee_id" format:"uuid" doc:"Null until a referee is assigned"`
	Number      int        `json:"number"`
	Strip       *string    `json:"strip"`
	StartTime   *time.Time `json:"start_time" doc:"Scheduled start, if one was set"`
	StartedAt   *time.Time `json:"started_at" doc:"When the pool actually started"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

func newPoolResponse(pool Pool) PoolResponse {
	var refereeID *string
	if pool.RefereeID != nil {
		id := pool.RefereeID.String()
		refereeID = &id
	}

	return PoolResponse{
		ID:          pool.ID.String(),
		PoolStageID: pool.PoolStageID.String(),
		RefereeID:   refereeID,
		Number:      pool.Number,
		Strip:       pool.Strip,
		StartTime:   pool.StartTime,
		StartedAt:   pool.StartedAt,
		CompletedAt: pool.CompletedAt,
		CreatedAt:   pool.CreatedAt,
		UpdatedAt:   pool.UpdatedAt,
	}
}

type PoolCreateItem struct {
	PoolStageID string     `json:"pool_stage_id" format:"uuid" doc:"Every pool in one request must share a pool stage"`
	Number      int        `json:"number" minimum:"1" doc:"Pool number, unique within its pool stage"`
	Strip       *string    `json:"strip,omitempty" maxLength:"200"`
	StartTime   *time.Time `json:"start_time,omitempty" doc:"Scheduled start"`
	RefereeID   *string    `json:"referee_id,omitempty" format:"uuid" doc:"Also referees every bout of the pool"`
	Fencers     []string   `json:"fencers" format:"uuid" minItems:"2" maxItems:"10" doc:"Competitor ids; grid position follows registration order"`
}

type PoolCreateBody struct {
	Pools            []PoolCreateItem `json:"pools" minItems:"1" maxItems:"100"`
	PointsToWin      int              `json:"points_to_win,omitempty" default:"5" minimum:"1" doc:"Touches to win each generated bout"`
	TimeLimitSeconds int              `json:"time_limit_seconds,omitempty" default:"180" minimum:"1" doc:"Time limit of each generated bout"`
}

type PoolCreateInput struct {
	Body PoolCreateBody
}

type PoolCreatedFencer struct {
	CompetitorID string `json:"competitor_id" format:"uuid"`
	Position     int    `json:"position" doc:"Row and column in the pool grid, from 1"`
}

type PoolCreatedBout struct {
	ID            string `json:"id" format:"uuid"`
	GroupSlot     int    `json:"group_slot"`
	Competitor1ID string `json:"competitor_1_id" format:"uuid"`
	Competitor2ID string `json:"competitor_2_id" format:"uuid"`
}

type PoolCreatedResponse struct {
	PoolResponse
	Fencers []PoolCreatedFencer `json:"fencers" doc:"Ordered by position"`
	Bouts   []PoolCreatedBout   `json:"bouts" doc:"Ordered by group_slot"`
}

func newPoolCreatedResponse(lineup PoolLineup) PoolCreatedResponse {
	fencers := make([]PoolCreatedFencer, 0, len(lineup.Fencers))
	for i, id := range lineup.Fencers {
		fencers = append(fencers, PoolCreatedFencer{CompetitorID: id.String(), Position: i + 1})
	}

	bouts := make([]PoolCreatedBout, 0, len(lineup.Bouts))
	for _, bout := range lineup.Bouts {
		bouts = append(bouts, PoolCreatedBout{
			ID:            bout.ID.String(),
			GroupSlot:     bout.GroupSlot,
			Competitor1ID: bout.Competitor1ID.String(),
			Competitor2ID: bout.Competitor2ID.String(),
		})
	}

	return PoolCreatedResponse{PoolResponse: newPoolResponse(lineup.Pool), Fencers: fencers, Bouts: bouts}
}

type PoolCreatedBody struct {
	Data []PoolCreatedResponse `json:"data"`
}

type PoolCreatedOutput struct {
	Body PoolCreatedBody
}

type PoolIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Pool ID"`
}

type PoolUpdateBody struct {
	RefereeID *string    `json:"referee_id,omitempty" format:"uuid" doc:"Referee to assign to the pool"`
	Number    *int       `json:"number,omitempty" minimum:"1"`
	Strip     *string    `json:"strip,omitempty" maxLength:"200"`
	StartTime *time.Time `json:"start_time,omitempty" doc:"New scheduled start"`
}

type PoolUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Pool ID"`
	Body PoolUpdateBody
}

// PoolStageID has no format:"uuid" tag because Huma rejects an empty optional
// query string against that format; an empty value is validated by
// utils.ParseUUID only when it is actually set.
type PoolListInput struct {
	PoolStageID string `query:"pool_stage_id" doc:"Filter by pool stage"`
	Limit       int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset      int    `query:"offset" default:"0" minimum:"0"`
}

type PoolOutput struct {
	Body PoolResponse
}

type PoolListBody struct {
	Data   []PoolResponse `json:"data"`
	Total  int64          `json:"total" doc:"Rows matching the filter, ignoring the page"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type PoolListOutput struct {
	Body PoolListBody
}
