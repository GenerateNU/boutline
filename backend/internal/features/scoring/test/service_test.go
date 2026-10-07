package test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/features/scoring"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func ptr[T any](v T) *T { return &v }

func createInput(createdBy, competitorID, BoutID string, points int) *scoring.ScoringCreateInput {
	return &scoring.ScoringCreateInput{
		Body: scoring.ScoringCreateBody{
			CreatedBy:    createdBy,
			CompetitorID: competitorID,
			BoutID:       BoutID,
			Points:       points,
		},
	}
}

func TestCreateScoring(t *testing.T) {
	t.Parallel()

	creator := uuid.New().String()
	competitor := uuid.New().String()
	match := uuid.New().String()

	tests := []struct {
		name       string
		input      *scoring.ScoringCreateInput
		wantPoints int
		wantCode   int
	}{
		{
			name:       "stores the score with the given points",
			input:      createInput(creator, competitor, match, 2),
			wantPoints: 2,
		},
		{
			name:       "keeps a single point",
			input:      createInput(creator, competitor, match, 1),
			wantPoints: 1,
		},
		{
			name:     "rejects a created_by that is not a uuid",
			input:    createInput("not-a-uuid", competitor, match, 1),
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a competitor_id that is not a uuid",
			input:    createInput(creator, "not-a-uuid", match, 1),
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a bout_id that is not a uuid",
			input:    createInput(creator, competitor, "not-a-uuid", 1),
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeScoringRepository()
			out, err := scoring.NewScoringService(repo).CreateScoring(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)
				assert.Empty(t, repo.Scores)

				return
			}

			require.NoError(t, err)
			assert.Positive(t, out.Body.ID)
			assert.Equal(t, tt.wantPoints, out.Body.Points)
			assert.Equal(t, tt.input.Body.CompetitorID, out.Body.CompetitorID)
			assert.Equal(t, tt.input.Body.BoutID, out.Body.BoutID)
			assert.Nil(t, out.Body.RevokedAt)
			assert.Nil(t, out.Body.RevokedBy)
			assert.Len(t, repo.Scores, 1)
		})
	}
}

func TestCreateScoringAssignsDistinctIDs(t *testing.T) {
	t.Parallel()

	creator := uuid.New().String()
	competitor := uuid.New().String()
	match := uuid.New().String()
	service := scoring.NewScoringService(NewFakeScoringRepository())

	first, err := service.CreateScoring(t.Context(), createInput(creator, competitor, match, 1))
	require.NoError(t, err)
	second, err := service.CreateScoring(t.Context(), createInput(creator, competitor, match, 1))
	require.NoError(t, err)

	assert.NotEqual(t, first.Body.ID, second.Body.ID)
}

func TestCreateScoringRejectsAnUnknownReference(t *testing.T) {
	t.Parallel()

	repo := NewFakeScoringRepository()
	repo.Err = fmt.Errorf("create scoring: %w",
		errs.Public("bout_id must reference an existing match", errs.ErrInvalidInput))

	_, err := scoring.NewScoringService(repo).CreateScoring(t.Context(),
		createInput(uuid.New().String(), uuid.New().String(), uuid.New().String(), 1))

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusBadRequest, code)
	assert.Equal(t, "bout_id must reference an existing match", detail)
}

func TestGetScoringByID(t *testing.T) {
	t.Parallel()

	stored := seeded(1, uuid.New())
	service := scoring.NewScoringService(NewFakeScoringRepository(stored))

	t.Run("returns the stored score", func(t *testing.T) {
		t.Parallel()

		out, err := service.GetScoringByID(t.Context(), &scoring.ScoringIDInput{ID: stored.ID})

		require.NoError(t, err)
		assert.Equal(t, stored.ID, out.Body.ID)
		assert.Equal(t, stored.BoutID.String(), out.Body.BoutID)
		assert.Equal(t, stored.Points, out.Body.Points)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetScoringByID(t.Context(), &scoring.ScoringIDInput{ID: 999})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
		assert.Equal(t, "not found", detail)
	})
}

func TestListScoring(t *testing.T) {
	t.Parallel()

	match := uuid.New()
	otherMatch := uuid.New()

	seed := []scoring.Scoring{
		seeded(1, match),
		seededRevoked(2, match),
		seeded(3, match),
		seeded(4, otherMatch),
	}

	tests := []struct {
		name       string
		input      *scoring.ScoringListInput
		wantIDs    []int64
		wantTotal  int64
		wantCode   int
		wantNoRows bool
	}{
		{
			name:      "returns only active scores for the match, oldest first",
			input:     &scoring.ScoringListInput{BoutID: match.String()},
			wantIDs:   []int64{1, 3},
			wantTotal: 2,
		},
		{
			name:      "includes revoked scores when asked",
			input:     &scoring.ScoringListInput{BoutID: match.String(), IncludeRevoked: true},
			wantIDs:   []int64{1, 2, 3},
			wantTotal: 3,
		},
		{
			name:      "keeps other matches out of the result",
			input:     &scoring.ScoringListInput{BoutID: otherMatch.String()},
			wantIDs:   []int64{4},
			wantTotal: 1,
		},
		{
			name:       "returns an empty list for a match with no scores",
			input:      &scoring.ScoringListInput{BoutID: uuid.New().String()},
			wantNoRows: true,
		},
		{
			name:     "rejects a match id that is not a uuid",
			input:    &scoring.ScoringListInput{BoutID: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := scoring.NewScoringService(NewFakeScoringRepository(seed...)).
				ListScoring(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)

			if tt.wantNoRows {
				assert.NotNil(t, out.Body.Data, "an empty list should serialise as [] rather than null")
				assert.Empty(t, out.Body.Data)

				return
			}

			ids := make([]int64, 0, len(out.Body.Data))
			for _, listed := range out.Body.Data {
				ids = append(ids, listed.ID)
			}
			assert.Equal(t, tt.wantIDs, ids)
		})
	}
}

func TestUpdateScoringByID(t *testing.T) {
	t.Parallel()

	newCompetitor := uuid.New().String()

	tests := []struct {
		name           string
		seedRevoked    bool
		body           scoring.ScoringUpdateBody
		useUnknownID   bool
		wantPoints     int
		wantCompetitor string // empty means "unchanged"
		wantCode       int
		wantDetail     string
	}{
		{
			name:       "changes the points without touching the competitor",
			body:       scoring.ScoringUpdateBody{Points: ptr(3)},
			wantPoints: 3,
		},
		{
			name:           "reassigns the competitor without touching the points",
			body:           scoring.ScoringUpdateBody{CompetitorID: ptr(newCompetitor)},
			wantPoints:     1,
			wantCompetitor: newCompetitor,
		},
		{
			name: "changes both fields at once",
			body: scoring.ScoringUpdateBody{
				Points:       ptr(2),
				CompetitorID: ptr(newCompetitor),
			},
			wantPoints:     2,
			wantCompetitor: newCompetitor,
		},
		{
			name:       "refuses a patch that would change nothing",
			body:       scoring.ScoringUpdateBody{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "no fields to update",
		},
		{
			name:       "rejects a competitor_id that is not a uuid",
			body:       scoring.ScoringUpdateBody{CompetitorID: ptr("not-a-uuid")},
			wantCode:   http.StatusBadRequest,
			wantDetail: "",
		},
		{
			name:        "refuses to edit a revoked score",
			seedRevoked: true,
			body:        scoring.ScoringUpdateBody{Points: ptr(2)},
			wantCode:    http.StatusConflict,
			wantDetail:  "score has been revoked and can no longer be edited",
		},
		{
			name:         "reports an unknown id as not found",
			body:         scoring.ScoringUpdateBody{Points: ptr(2)},
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seeded(1, uuid.New())
			if tt.seedRevoked {
				stored = seededRevoked(1, stored.BoutID)
			}
			repo := NewFakeScoringRepository(stored)

			id := stored.ID
			if tt.useUnknownID {
				id = 999
			}

			out, err := scoring.NewScoringService(repo).UpdateScoringByID(t.Context(),
				&scoring.ScoringUpdateInput{ID: id, Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, stored.Points, repo.Scores[stored.ID].Points)
				assert.Equal(t, stored.CompetitorID, repo.Scores[stored.ID].CompetitorID)

				return
			}

			wantCompetitor := stored.CompetitorID.String()
			if tt.wantCompetitor != "" {
				wantCompetitor = tt.wantCompetitor
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantPoints, out.Body.Points)
			assert.Equal(t, wantCompetitor, out.Body.CompetitorID)
			assert.Equal(t, stored.BoutID.String(), out.Body.BoutID)

			assert.Equal(t, tt.wantPoints, repo.Scores[stored.ID].Points)
			assert.Equal(t, wantCompetitor, repo.Scores[stored.ID].CompetitorID.String())
			assert.Equal(t, stored.BoutID, repo.Scores[stored.ID].BoutID)
		})
	}
}

func TestRevokeScoring(t *testing.T) {
	t.Parallel()

	referee := uuid.New().String()

	tests := []struct {
		name         string
		seedRevoked  bool
		revokedBy    string
		useUnknownID bool
		wantCode     int
	}{
		{name: "marks the score as revoked", revokedBy: referee},
		{
			name:        "refuses a score that is already revoked",
			seedRevoked: true,
			revokedBy:   referee,
			wantCode:    http.StatusConflict,
		},
		{
			name:      "rejects a revoked_by that is not a uuid",
			revokedBy: "not-a-uuid",
			wantCode:  http.StatusBadRequest,
		},
		{
			name:         "reports an unknown id as not found",
			revokedBy:    referee,
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seeded(1, uuid.New())
			if tt.seedRevoked {
				stored = seededRevoked(1, stored.BoutID)
			}
			repo := NewFakeScoringRepository(stored)

			id := stored.ID
			if tt.useUnknownID {
				id = 999
			}

			out, err := scoring.NewScoringService(repo).RevokeScoring(t.Context(),
				&scoring.ScoringRevokeInput{
					ID:   id,
					Body: scoring.ScoringRevokeBody{RevokedBy: tt.revokedBy},
				})

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)

				if !tt.useUnknownID && !tt.seedRevoked {
					assert.Nil(t, repo.Scores[stored.ID].RevokedAt)
					assert.Nil(t, repo.Scores[stored.ID].RevokedBy)
				}

				return
			}

			require.NoError(t, err)
			require.NotNil(t, out.Body.RevokedAt)
			require.NotNil(t, out.Body.RevokedBy)
			assert.Equal(t, tt.revokedBy, *out.Body.RevokedBy)

			require.NotNil(t, repo.Scores[stored.ID].RevokedAt)
			require.NotNil(t, repo.Scores[stored.ID].RevokedBy)
			assert.Equal(t, tt.revokedBy, repo.Scores[stored.ID].RevokedBy.String())
		})
	}
}

func TestRevokedScoreDropsOutOfTheLiveList(t *testing.T) {
	t.Parallel()

	match := uuid.New()
	service := scoring.NewScoringService(NewFakeScoringRepository(seeded(1, match)))

	_, err := service.RevokeScoring(t.Context(), &scoring.ScoringRevokeInput{
		ID:   1,
		Body: scoring.ScoringRevokeBody{RevokedBy: uuid.New().String()},
	})
	require.NoError(t, err)

	live, err := service.ListScoring(t.Context(), &scoring.ScoringListInput{BoutID: match.String()})
	require.NoError(t, err)
	assert.Empty(t, live.Body.Data)
	assert.Zero(t, live.Body.Total)

	replay, err := service.ListScoring(t.Context(),
		&scoring.ScoringListInput{BoutID: match.String(), IncludeRevoked: true})
	require.NoError(t, err)
	assert.Len(t, replay.Body.Data, 1)
}

func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeScoringRepository()
	repo.Err = errors.New("connection refused")

	_, err := scoring.NewScoringService(repo).
		ListScoring(t.Context(), &scoring.ScoringListInput{BoutID: uuid.New().String()})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
