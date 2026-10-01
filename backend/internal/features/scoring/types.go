package scoring

import "time"

type ScoringResponse struct {
	ID           int64      `json:"id"`
	CreatedBy    string     `json:"created_by" format:"uuid"`
	Points       int        `json:"points" doc:"Points granted for this score"`
	CompetitorID string     `json:"competitor_id" format:"uuid"`
	MatchID      string     `json:"match_id" format:"uuid"`
	RevokedAt    *time.Time `json:"revoked_at" doc:"Set when a referee revokes the score (soft delete), otherwise null"`
	RevokedBy    *string    `json:"revoked_by" format:"uuid" doc:"Referee who revoked the score, otherwise null"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func newScoringResponse(scoring Scoring) ScoringResponse {
	var revokedBy *string
	if scoring.RevokedBy != nil {
		s := scoring.RevokedBy.String()
		revokedBy = &s
	}

	return ScoringResponse{
		ID:           scoring.ID,
		CreatedBy:    scoring.CreatedBy.String(),
		Points:       scoring.Points,
		CompetitorID: scoring.CompetitorID.String(),
		MatchID:      scoring.MatchID.String(),
		RevokedAt:    scoring.RevokedAt,
		RevokedBy:    revokedBy,
		CreatedAt:    scoring.CreatedAt,
		UpdatedAt:    scoring.UpdatedAt,
	}
}

type ScoringCreateBody struct {
	CreatedBy    string `json:"created_by" format:"uuid" doc:"User recording the score"`
	Points       int    `json:"points,omitempty" default:"1" minimum:"1" doc:"Points granted for this score, defaults to 1"`
	CompetitorID string `json:"competitor_id" format:"uuid" doc:"Competitor who scored"`
	MatchID      string `json:"match_id" format:"uuid" doc:"Match the score belongs to"`
}

type ScoringCreateInput struct {
	Body ScoringCreateBody
}

type ScoringIDInput struct {
	ID int64 `path:"id" minimum:"1" doc:"Scoring ID"`
}

type ScoringRevokeInput struct {
	ID   int64 `path:"id" minimum:"1" doc:"Scoring ID"`
	Body ScoringRevokeBody
}

type ScoringRevokeBody struct {
	RevokedBy string `json:"revoked_by" format:"uuid" doc:"Referee revoking the score"`
}

type ScoringUpdateBody struct {
	Points       *int    `json:"points,omitempty" minimum:"1" doc:"New points value"`
	CompetitorID *string `json:"competitor_id,omitempty" format:"uuid" doc:"New competitor ID"`
}

type ScoringUpdateInput struct {
	ID   int64 `path:"id" minimum:"1" doc:"Scoring ID"`
	Body ScoringUpdateBody
}

type ScoringListInput struct {
	MatchID        string `path:"match_id" format:"uuid" doc:"Match ID"`
	IncludeRevoked bool   `query:"include_revoked" default:"false" doc:"Include revoked scores, for replay"`
}

type ScoringOutput struct {
	Body ScoringResponse
}

type ScoringListBody struct {
	Data  []ScoringResponse `json:"data"`
	Total int64             `json:"total" doc:"Scores returned for the match"`
}

type ScoringListOutput struct {
	Body ScoringListBody
}
