package test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"testing"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/bout"
	"boutline/internal/features/scoring"
	"boutline/internal/features/user"

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

func createInput(competitorID, boutID string, points int) *scoring.ScoringCreateInput {
	return &scoring.ScoringCreateInput{
		Body: scoring.ScoringCreateBody{
			CompetitorID: competitorID,
			BoutID:       boutID,
			Points:       points,
		},
	}
}

// refereedBout is a bout whose assigned referee is the given user, or nobody.
func refereedBout(referee *uuid.UUID) bout.Bout {
	return bout.Bout{ID: uuid.New(), RefereeID: referee}
}

func asCaller(ctx context.Context, caller *uuid.UUID) context.Context {
	if caller == nil {
		return ctx
	}

	return user.WithUserID(ctx, *caller)
}

func TestCreateScoring(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	competitor := uuid.New().String()
	match := refereedBout(&referee)

	tests := []struct {
		name       string
		input      *scoring.ScoringCreateInput
		wantPoints int
		wantCode   int
	}{
		{
			name:       "stores the score with the given points",
			input:      createInput(competitor, match.ID.String(), 2),
			wantPoints: 2,
		},
		{
			name:       "keeps a single point",
			input:      createInput(competitor, match.ID.String(), 1),
			wantPoints: 1,
		},
		{
			name:     "rejects a competitor_id that is not a uuid",
			input:    createInput("not-a-uuid", match.ID.String(), 1),
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a bout_id that is not a uuid",
			input:    createInput(competitor, "not-a-uuid", 1),
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeScoringRepository()
			out, err := scoring.NewScoringService(repo, NewFakeBoutLookup(match)).
				CreateScoring(asCaller(t.Context(), &referee), tt.input)

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
			assert.Equal(t, referee.String(), out.Body.CreatedBy)
			assert.Nil(t, out.Body.RevokedAt)
			assert.Nil(t, out.Body.RevokedBy)
			assert.Len(t, repo.Scores, 1)
		})
	}
}

func TestCreateScoringAuthorization(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	stranger := uuid.New()

	tests := []struct {
		name        string
		caller      *uuid.UUID
		boutReferee *uuid.UUID
		unknownBout bool
		wantCode    int
		wantDetail  string
	}{
		{name: "records the assigned referee as created_by", caller: &referee, boutReferee: &referee},
		{
			name:        "refuses a different signed-in user",
			caller:      &stranger,
			boutReferee: &referee,
			wantCode:    http.StatusForbidden,
			wantDetail:  "only the bout's assigned referee can do this",
		},
		{
			name:        "refuses a request with no caller",
			boutReferee: &referee,
			wantCode:    http.StatusForbidden,
			wantDetail:  "only the bout's assigned referee can do this",
		},
		{
			name:       "refuses a bout with no referee",
			caller:     &referee,
			wantCode:   http.StatusForbidden,
			wantDetail: "only the bout's assigned referee can do this",
		},
		{
			name:        "rejects an unknown bout_id",
			caller:      &referee,
			unknownBout: true,
			wantCode:    http.StatusBadRequest,
			wantDetail:  "bout_id must reference an existing bout",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			match := refereedBout(tt.boutReferee)
			boutID := match.ID.String()
			if tt.unknownBout {
				boutID = uuid.New().String()
			}
			repo := NewFakeScoringRepository()

			out, err := scoring.NewScoringService(repo, NewFakeBoutLookup(match)).
				CreateScoring(asCaller(t.Context(), tt.caller), createInput(uuid.New().String(), boutID, 1))

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				assert.Empty(t, repo.Scores)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.caller.String(), out.Body.CreatedBy)
			assert.Equal(t, *tt.caller, repo.Scores[out.Body.ID].CreatedBy)
		})
	}
}

func TestCreateScoringAssignsDistinctIDs(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	competitor := uuid.New().String()
	match := refereedBout(&referee)
	service := scoring.NewScoringService(NewFakeScoringRepository(), NewFakeBoutLookup(match))
	ctx := asCaller(t.Context(), &referee)

	first, err := service.CreateScoring(ctx, createInput(competitor, match.ID.String(), 1))
	require.NoError(t, err)
	second, err := service.CreateScoring(ctx, createInput(competitor, match.ID.String(), 1))
	require.NoError(t, err)

	assert.NotEqual(t, first.Body.ID, second.Body.ID)
}

func TestCreateScoringRejectsAnUnknownReference(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	match := refereedBout(&referee)
	repo := NewFakeScoringRepository()
	repo.Err = fmt.Errorf("create scoring: %w",
		errs.Public("bout_id must reference an existing match", errs.ErrInvalidInput))

	_, err := scoring.NewScoringService(repo, NewFakeBoutLookup(match)).
		CreateScoring(asCaller(t.Context(), &referee), createInput(uuid.New().String(), match.ID.String(), 1))

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusBadRequest, code)
	assert.Equal(t, "bout_id must reference an existing match", detail)
}

func TestGetScoringByID(t *testing.T) {
	t.Parallel()

	stored := seeded(1, uuid.New())
	service := scoring.NewScoringService(NewFakeScoringRepository(stored), NewFakeBoutLookup())

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
		wantLimit  int
		wantOffset int
		wantCode   int
		wantNoRows bool
	}{
		{
			name:      "returns only active scores for the match, newest first",
			input:     &scoring.ScoringListInput{BoutID: match.String()},
			wantIDs:   []int64{3, 1},
			wantTotal: 2,
		},
		{
			name:      "includes revoked scores when asked",
			input:     &scoring.ScoringListInput{BoutID: match.String(), IncludeRevoked: true},
			wantIDs:   []int64{3, 2, 1},
			wantTotal: 3,
		},
		{
			name:      "keeps other matches out of the result",
			input:     &scoring.ScoringListInput{BoutID: otherMatch.String()},
			wantIDs:   []int64{4},
			wantTotal: 1,
		},
		{
			name: "pages through scores while total counts every match",
			input: &scoring.ScoringListInput{
				BoutID: match.String(), IncludeRevoked: true, Limit: 1, Offset: 1,
			},
			wantIDs:    []int64{2},
			wantTotal:  3,
			wantLimit:  1,
			wantOffset: 1,
		},
		{
			name:      "clamps an oversized limit and a negative offset",
			input:     &scoring.ScoringListInput{BoutID: match.String(), Limit: 1000, Offset: -5},
			wantIDs:   []int64{3, 1},
			wantTotal: 2,
			wantLimit: scoring.ScoringMaxPageSize,
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

			out, err := scoring.NewScoringService(NewFakeScoringRepository(seed...), NewFakeBoutLookup()).
				ListScoring(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			if tt.wantLimit != 0 {
				assert.Equal(t, tt.wantLimit, out.Body.Limit)
				assert.Equal(t, tt.wantOffset, out.Body.Offset)
			}

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

			referee := uuid.New()
			match := refereedBout(&referee)
			stored := seeded(1, match.ID)
			if tt.seedRevoked {
				stored = seededRevoked(1, match.ID)
			}
			repo := NewFakeScoringRepository(stored)

			id := stored.ID
			if tt.useUnknownID {
				id = 999
			}

			out, err := scoring.NewScoringService(repo, NewFakeBoutLookup(match)).
				UpdateScoringByID(asCaller(t.Context(), &referee), &scoring.ScoringUpdateInput{ID: id, Body: tt.body})

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

func TestUpdateScoringAuthorization(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	stranger := uuid.New()

	tests := []struct {
		name        string
		caller      *uuid.UUID
		boutReferee *uuid.UUID
		wantForbid  bool
	}{
		{name: "lets the assigned referee edit", caller: &referee, boutReferee: &referee},
		{name: "refuses a different signed-in user", caller: &stranger, boutReferee: &referee, wantForbid: true},
		{name: "refuses a request with no caller", boutReferee: &referee, wantForbid: true},
		{name: "refuses a bout with no referee", caller: &referee, wantForbid: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			match := refereedBout(tt.boutReferee)
			stored := seeded(1, match.ID)
			repo := NewFakeScoringRepository(stored)

			out, err := scoring.NewScoringService(repo, NewFakeBoutLookup(match)).
				UpdateScoringByID(asCaller(t.Context(), tt.caller),
					&scoring.ScoringUpdateInput{ID: stored.ID, Body: scoring.ScoringUpdateBody{Points: ptr(4)}})

			if tt.wantForbid {
				code, detail := apiError(t, err)
				assert.Equal(t, http.StatusForbidden, code)
				assert.Equal(t, "only the bout's assigned referee can do this", detail)
				assert.Nil(t, out)
				assert.Equal(t, stored.Points, repo.Scores[stored.ID].Points)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, 4, out.Body.Points)
			assert.Equal(t, 4, repo.Scores[stored.ID].Points)
		})
	}
}

func TestRevokeScoring(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		seedRevoked  bool
		useUnknownID bool
		wantCode     int
	}{
		{name: "marks the score as revoked"},
		{name: "refuses a score that is already revoked", seedRevoked: true, wantCode: http.StatusConflict},
		{name: "reports an unknown id as not found", useUnknownID: true, wantCode: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			referee := uuid.New()
			match := refereedBout(&referee)
			stored := seeded(1, match.ID)
			if tt.seedRevoked {
				stored = seededRevoked(1, match.ID)
			}
			repo := NewFakeScoringRepository(stored)

			id := stored.ID
			if tt.useUnknownID {
				id = 999
			}

			out, err := scoring.NewScoringService(repo, NewFakeBoutLookup(match)).
				RevokeScoring(asCaller(t.Context(), &referee), &scoring.ScoringRevokeInput{ID: id})

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
			assert.Equal(t, referee.String(), *out.Body.RevokedBy)

			require.NotNil(t, repo.Scores[stored.ID].RevokedAt)
			require.NotNil(t, repo.Scores[stored.ID].RevokedBy)
			assert.Equal(t, referee, *repo.Scores[stored.ID].RevokedBy)
		})
	}
}

func TestRevokeScoringAuthorization(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	stranger := uuid.New()

	tests := []struct {
		name        string
		caller      *uuid.UUID
		boutReferee *uuid.UUID
		wantForbid  bool
	}{
		{name: "records the assigned referee as revoked_by", caller: &referee, boutReferee: &referee},
		{name: "refuses a different signed-in user", caller: &stranger, boutReferee: &referee, wantForbid: true},
		{name: "refuses a request with no caller", boutReferee: &referee, wantForbid: true},
		{name: "refuses a bout with no referee", caller: &referee, wantForbid: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			match := refereedBout(tt.boutReferee)
			stored := seeded(1, match.ID)
			repo := NewFakeScoringRepository(stored)

			out, err := scoring.NewScoringService(repo, NewFakeBoutLookup(match)).
				RevokeScoring(asCaller(t.Context(), tt.caller), &scoring.ScoringRevokeInput{ID: stored.ID})

			if tt.wantForbid {
				code, detail := apiError(t, err)
				assert.Equal(t, http.StatusForbidden, code)
				assert.Equal(t, "only the bout's assigned referee can do this", detail)
				assert.Nil(t, out)
				assert.Nil(t, repo.Scores[stored.ID].RevokedAt)
				assert.Nil(t, repo.Scores[stored.ID].RevokedBy)

				return
			}

			require.NoError(t, err)
			require.NotNil(t, out.Body.RevokedBy)
			assert.Equal(t, tt.caller.String(), *out.Body.RevokedBy)
			require.NotNil(t, repo.Scores[stored.ID].RevokedBy)
			assert.Equal(t, *tt.caller, *repo.Scores[stored.ID].RevokedBy)
		})
	}
}

func TestRevokedScoreDropsOutOfTheLiveList(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	match := refereedBout(&referee)
	service := scoring.NewScoringService(NewFakeScoringRepository(seeded(1, match.ID)), NewFakeBoutLookup(match))

	_, err := service.RevokeScoring(asCaller(t.Context(), &referee), &scoring.ScoringRevokeInput{ID: 1})
	require.NoError(t, err)

	live, err := service.ListScoring(t.Context(), &scoring.ScoringListInput{BoutID: match.ID.String()})
	require.NoError(t, err)
	assert.Empty(t, live.Body.Data)
	assert.Zero(t, live.Body.Total)

	replay, err := service.ListScoring(t.Context(),
		&scoring.ScoringListInput{BoutID: match.ID.String(), IncludeRevoked: true})
	require.NoError(t, err)
	assert.Len(t, replay.Body.Data, 1)
}

func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeScoringRepository()
	repo.Err = errors.New("connection refused")

	_, err := scoring.NewScoringService(repo, NewFakeBoutLookup()).
		ListScoring(t.Context(), &scoring.ScoringListInput{BoutID: uuid.New().String()})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}

func touch(id int64, boutID, competitorID uuid.UUID, points int) scoring.Scoring {
	s := seeded(id, boutID)
	s.CompetitorID = competitorID
	s.Points = points

	return s
}

// lateSavedFixture is a bout whose second touch was saved first, so its ids disagree with its timestamps,
// and whose last two touches share a timestamp.
func lateSavedFixture() (bout.Bout, []scoring.Scoring) {
	c1, c2 := uuid.New(), uuid.New()
	match := bout.Bout{ID: uuid.New(), Competitor1ID: c1, Competitor2ID: c2}
	at := time.Now()
	scores := []scoring.Scoring{touch(10, match.ID, c1, 1), touch(11, match.ID, c2, 1), touch(12, match.ID, c1, 1)}
	scores[0].CreatedAt = at.Add(2 * time.Second)
	scores[1].CreatedAt = at.Add(time.Second)
	scores[2].CreatedAt = at.Add(2 * time.Second)

	return match, scores
}

// historyFixture is one bout with a revoked touch, a touch on another bout and a touch by a stranger.
func historyFixture() (bout.Bout, []scoring.Scoring) {
	c1, c2 := uuid.New(), uuid.New()
	match := bout.Bout{ID: uuid.New(), Competitor1ID: c1, Competitor2ID: c2}
	revoked := touch(3, match.ID, c1, 1)
	revokedAt := time.Now()
	revoked.RevokedAt = &revokedAt

	return match, []scoring.Scoring{
		touch(1, match.ID, c1, 1),
		touch(2, match.ID, c2, 1),
		revoked,
		touch(4, match.ID, c1, 2),
		touch(5, uuid.New(), c1, 1),
		touch(6, match.ID, uuid.New(), 1),
	}
}

type historyEntryWant struct {
	id      int64
	c1, c2  int
	revoked bool
}

func TestGetScoringHistory(t *testing.T) {
	t.Parallel()

	match, seed := historyFixture()
	lateSaved, lateSeed := lateSavedFixture()
	seed = append(seed, lateSeed...)
	emptyMatch := bout.Bout{ID: uuid.New(), Competitor1ID: uuid.New(), Competitor2ID: uuid.New()}

	tests := []struct {
		name       string
		boutID     string
		repoErr    error
		lookupErr  error
		want       []historyEntryWant
		wantCode   int
		wantDetail string
	}{
		{
			name:   "lists every score newest first; a revoked one shows the score it produced but later scores skip it",
			boutID: match.ID.String(),
			want: []historyEntryWant{
				{6, 3, 1, false}, {4, 3, 1, false}, {3, 2, 1, true}, {2, 1, 1, false}, {1, 1, 0, false},
			},
		},
		{
			name:   "orders by when each score was recorded, then by id, even when ids were assigned out of order",
			boutID: lateSaved.ID.String(),
			want:   []historyEntryWant{{12, 2, 1, false}, {10, 1, 1, false}, {11, 0, 1, false}},
		},
		{
			name:   "returns an empty list for a bout with no scores",
			boutID: emptyMatch.ID.String(),
			want:   []historyEntryWant{},
		},
		{
			name:       "reports an unknown bout as not found",
			boutID:     uuid.New().String(),
			wantCode:   http.StatusNotFound,
			wantDetail: "not found",
		},
		{
			name:     "rejects a bout id that is not a uuid",
			boutID:   "not-a-uuid",
			wantCode: http.StatusBadRequest,
		},
		{
			name:       "reports a repository failure as a server error",
			boutID:     match.ID.String(),
			repoErr:    errors.New("connection refused"),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
		{
			name:       "reports a bout lookup failure as a server error",
			boutID:     match.ID.String(),
			lookupErr:  errors.New("connection refused"),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeScoringRepository(seed...)
			repo.Err = tt.repoErr
			bouts := NewFakeBoutLookup(match, lateSaved, emptyMatch)
			bouts.Err = tt.lookupErr

			out, err := scoring.NewScoringService(repo, bouts).
				GetScoringHistory(t.Context(), &scoring.ScoringHistoryInput{BoutID: tt.boutID})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			require.NotNil(t, out.Body.Data, "an empty history should serialise as [] rather than null")
			got := make([]historyEntryWant, 0, len(out.Body.Data))
			for _, entry := range out.Body.Data {
				got = append(got, historyEntryWant{entry.ID, entry.Competitor1Score, entry.Competitor2Score, entry.RevokedAt != nil})
			}
			assert.Equal(t, tt.want, got)
		})
	}
}
