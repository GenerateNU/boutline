package poolresult

import "boutline/internal/features/pool"

const (
	PoolResultMinPageSize     = 1
	PoolResultDefaultPageSize = 20
	PoolResultMaxPageSize     = 100
)

type PoolResultListInput struct {
	ID     string `path:"id" format:"uuid" doc:"Event ID"`
	Limit  int    `query:"limit" default:"20" minimum:"1" maximum:"100"`
	Offset int    `query:"offset" default:"0" minimum:"0"`
}

type PoolResultResponse struct {
	pool.PoolStanding
	CompetitorID string           `json:"competitor_id" format:"uuid"`
	FirstName    string           `json:"first_name"`
	LastName     string           `json:"last_name"`
	Club         *string          `json:"club" nullable:"true" doc:"Primary club, else team; null when the fencer has neither"`
	PoolNumber   int              `json:"pool_number"`
	Status       PoolResultStatus `json:"status" enum:"pending,advanced,eliminated" doc:"pending until the tableau is drawn, then whether the fencer is in it"`
}

type PoolResultListBody struct {
	Data   []PoolResultResponse `json:"data" doc:"Ordered by stage-wide place"`
	Total  int64                `json:"total" doc:"Fencers ranked, ignoring the page"`
	Limit  int                  `json:"limit"`
	Offset int                  `json:"offset"`
}

type PoolResultListOutput struct {
	Body PoolResultListBody
}

func newPoolResultResponse(row PoolResultRow) PoolResultResponse {
	return PoolResultResponse{
		PoolStanding: row.Standing,
		CompetitorID: row.Fencer.CompetitorID.String(),
		FirstName:    row.Fencer.FirstName,
		LastName:     row.Fencer.LastName,
		Club:         row.Fencer.Club,
		PoolNumber:   row.Fencer.PoolNumber,
		Status:       row.Status,
	}
}
