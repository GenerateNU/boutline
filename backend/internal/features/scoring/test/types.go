package scoring

import "time"

type ScoringResponse struct {
	ID           int64      `json:"id"`
	CreatedBy    string     `json:"created_by" format:"uuid"`
	Points       int        `json:"points" default:"1" minimum:"1" doc:"Points granted for this score"`
	CompetitorID string     `json:"competitor_id" format:"uuid"`
	MatchID      string     `json:"match_id" format:"uuid"`
	RevokedAt    *time.Time `json:"revoked_at" doc:"Set when a referee revokes the score (soft delete), otherwise null"`
	RevokedBy    *string    `json:"revoked_by" format:"uuid" doc:"Referee who revoked the score, otherwise null"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func newScoringResponse(scoring Scoring) ScoringResponse {
	return ScoringResponse{
		ID:           scoring.ID,
		CreatedBy:    scoring.CreatedBy.String(),
		Points:       scoring.Points,
		CompetitorID: scoring.CompetitorID.String(),
		MatchID:      scoring.MatchID.String(),
		RevokedAt:    scoring.RevokedAt,
		RevokedBy:    scoring.RevokedBy,
		CreatedAt:    scoring.CreatedAt,
		UpdatedAt:    scoring.UpdatedAt,
	}
}

type ScoringCreateBody struct {
	CreatedBy    string     `json:"created_by" format:"uuid"`
	Points       int        `json:"points" default:"1" minimum:"1" doc:"Points granted for this score"`
	CompetitorID string     `json:"competitor_id" format:"uuid"`
	MatchID      string     `json:"match_id" format:"uuid"`
	RevokedAt    *time.Time `json:"revoked_at" doc:"Set when a referee revokes the score (soft delete), otherwise null"`
	RevokedBy    *string    `json:"revoked_by" format:"uuid" doc:"Referee who revoked the score, otherwise null"`
}

type ScoringCreateInput struct {
	Body ScoringCreateBody
}

type ScoringIDInput struct {
	ID string `path:"id" format:"uuid" doc:"Scoring ID"`
}

type ScoringUpdateBody struct {
	CreatedBy    *string     `json:"created_by" format:"uuid"`
	Points       *int        `json:"points" default:"1" minimum:"1" doc:"Points granted for this score"`
	CompetitorID *string     `json:"competitor_id" format:"uuid"`
	MatchID      *string     `json:"match_id" format:"uuid"`
	RevokedAt    *time.Time `json:"revoked_at" doc:"Set when a referee revokes the score (soft delete), otherwise null"`
	RevokedBy    *string    `json:"revoked_by" format:"uuid" doc:"Referee who revoked the score, otherwise null"`
}

type ScoringUpdateInput struct {
	ID   string `path:"id" format:"uuid" doc:"Scoring ID"`
	Body ScoringUpdateBody
}