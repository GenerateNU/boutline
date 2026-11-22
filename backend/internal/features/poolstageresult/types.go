package poolstageresult

import "boutline/internal/features/pool"

const (
	PoolStageResultMinPageSize     = 1
	PoolStageResultDefaultPageSize = 20
	PoolStageResultMaxPageSize     = 100
)

type PoolStageResultListInput struct {
	ID     string `path:"id" format:"uuid" doc:"Event ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type PoolStageResultResponse struct {
	pool.PoolStanding
	CompetitorID string                `json:"competitor_id" format:"uuid"`
	FirstName    string                `json:"first_name"`
	LastName     string                `json:"last_name"`
	Club         *string               `json:"club" nullable:"true" doc:"Primary club, else team; null when the fencer has neither"`
	PoolNumber   int                   `json:"pool_number"`
	Status       PoolStageResultStatus `json:"status" enum:"pending,advanced,eliminated" doc:"pending until the tableau is drawn, then whether the fencer is in it"`
}

type PoolStageResultListBody struct {
	Data   []PoolStageResultResponse `json:"data" doc:"Ordered by stage-wide place"`
	Total  int64                     `json:"total" doc:"Fencers ranked, ignoring the page"`
	Limit  int                       `json:"limit"`
	Offset int                       `json:"offset"`
}

type PoolStageResultListOutput struct {
	Body PoolStageResultListBody
}

func newPoolStageResultResponse(row PoolStageResultRow) PoolStageResultResponse {
	return PoolStageResultResponse{
		PoolStanding: row.Standing,
		CompetitorID: row.Fencer.CompetitorID.String(),
		FirstName:    row.Fencer.FirstName,
		LastName:     row.Fencer.LastName,
		Club:         row.Fencer.Club,
		PoolNumber:   row.Fencer.PoolNumber,
		Status:       row.Status,
	}
}
