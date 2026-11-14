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
	"boutline/internal/session"

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

const notAssignedDetail = "only the bout's assigned referee can start, score or end it"

// callerCtx runs as caller; uuid.Nil means no signed-in caller.
func callerCtx(t *testing.T, caller uuid.UUID) context.Context {
	t.Helper()

	if caller == uuid.Nil {
		return t.Context()
	}

	return session.WithUserID(t.Context(), caller)
}

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
	match := TestBoutID.String()

	tests := []struct {
		name       string
		caller     uuid.UUID // uuid.Nil means no caller
		input      *scoring.ScoringCreateInput
		wantPoints int
		wantCode   int
	}{
		{
			name:       "stores the score with the given points",
			caller:     TestRefereeID,
			input:      createInput(creator, competitor, match, 2),
			wantPoints: 2,
		},
		{
			name:       "keeps a single point",
			caller:     TestRefereeID,
			input:      createInput(creator, competitor, match, 1),
			wantPoints: 1,
		},
		{
			name:     "refuses an admin who is not the bout's referee",
			caller:   TestAdminID,
			input:    createInput(creator, competitor, match, 1),
			wantCode: http.StatusForbidden,
		},
		{
			name:     "refuses a request with no caller",
			input:    createInput(creator, competitor, match, 1),
			wantCode: http.StatusForbidden,
		},
		{
			name:     "refuses a caller outside the tournament",
			caller:   TestOutsiderID,
			input:    createInput(creator, competitor, match, 1),
			wantCode: http.StatusForbidden,
		},
		{
			name:     "reports an unknown bout as not found",
			caller:   TestRefereeID,
			input:    createInput(creator, competitor, uuid.NewString(), 1),
			wantCode: http.StatusNotFound,
		},
		{
			name:     "rejects a created_by that is not a uuid",
			caller:   TestRefereeID,
			input:    createInput("not-a-uuid", competitor, match, 1),
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a competitor_id that is not a uuid",
			caller:   TestRefereeID,
			input:    createInput(creator, "not-a-uuid", match, 1),
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a bout_id that is not a uuid",
			caller:   TestRefereeID,
			input:    createInput(creator, competitor, "not-a-uuid", 1),
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeScoringRepository()
			out, err := scoring.NewScoringService(repo, NewTestBouts(), NewTestMemberships()).
				CreateScoring(callerCtx(t, tt.caller), tt.input)

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
	match := TestBoutID.String()
	service := scoring.NewScoringService(NewFakeScoringRepository(), NewTestBouts(), NewTestMemberships())
	ctx := callerCtx(t, TestRefereeID)

	first, err := service.CreateScoring(ctx, createInput(creator, competitor, match, 1))
	require.NoError(t, err)
	second, err := service.CreateScoring(ctx, createInput(creator, competitor, match, 1))
	require.NoError(t, err)

	assert.NotEqual(t, first.Body.ID, second.Body.ID)
}

func TestCreateScoringRejectsAnUnknownReference(t *testing.T) {
	t.Parallel()

	repo := NewFakeScoringRepository()
	repo.Err = fmt.Errorf("create scoring: %w",
		errs.Public("bout_id must reference an existing match", errs.ErrInvalidInput))

	_, err := scoring.NewScoringService(repo, NewTestBouts(), NewTestMemberships()).CreateScoring(
		callerCtx(t, TestRefereeID),
		createInput(uuid.New().String(), uuid.New().String(), TestBoutID.String(), 1))

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusBadRequest, code)
	assert.Equal(t, "bout_id must reference an existing match", detail)
}

func TestGetScoringByID(t *testing.T) {
	t.Parallel()

	stored := seeded(1, uuid.New())
	service := scoring.NewScoringService(NewFakeScoringRepository(stored), NewFakeBoutLookup(), NewTestMemberships())

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

			out, err := scoring.NewScoringService(NewFakeScoringRepository(seed...), NewFakeBoutLookup(), NewTestMemberships()).
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
		caller         uuid.UUID // uuid.Nil means no caller
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
			caller:     TestRefereeID,
			body:       scoring.ScoringUpdateBody{Points: ptr(3)},
			wantPoints: 3,
		},
		{
			name:           "reassigns the competitor without touching the points",
			caller:         TestRefereeID,
			body:           scoring.ScoringUpdateBody{CompetitorID: ptr(newCompetitor)},
			wantPoints:     1,
			wantCompetitor: newCompetitor,
		},
		{
			name:   "changes both fields at once",
			caller: TestRefereeID,
			body: scoring.ScoringUpdateBody{
				Points:       ptr(2),
				CompetitorID: ptr(newCompetitor),
			},
			wantPoints:     2,
			wantCompetitor: newCompetitor,
		},
		{
			name:       "refuses a patch that would change nothing",
			caller:     TestRefereeID,
			body:       scoring.ScoringUpdateBody{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "no fields to update",
		},
		{
			name:       "rejects a competitor_id that is not a uuid",
			caller:     TestRefereeID,
			body:       scoring.ScoringUpdateBody{CompetitorID: ptr("not-a-uuid")},
			wantCode:   http.StatusBadRequest,
			wantDetail: "",
		},
		{
			name:        "refuses to edit a revoked score",
			caller:      TestRefereeID,
			seedRevoked: true,
			body:        scoring.ScoringUpdateBody{Points: ptr(2)},
			wantCode:    http.StatusConflict,
			wantDetail:  "score has been revoked and can no longer be edited",
		},
		{
			name:         "reports an unknown id as not found",
			caller:       TestRefereeID,
			body:         scoring.ScoringUpdateBody{Points: ptr(2)},
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
		{
			name:       "refuses an admin who is not the bout's referee",
			caller:     TestAdminID,
			body:       scoring.ScoringUpdateBody{Points: ptr(3)},
			wantCode:   http.StatusForbidden,
			wantDetail: notAssignedDetail,
		},
		{
			name:     "refuses a request with no caller",
			body:     scoring.ScoringUpdateBody{Points: ptr(3)},
			wantCode: http.StatusForbidden,
		},
		{
			name:     "refuses a caller outside the tournament",
			caller:   TestOutsiderID,
			body:     scoring.ScoringUpdateBody{Points: ptr(3)},
			wantCode: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seeded(1, TestBoutID)
			if tt.seedRevoked {
				stored = seededRevoked(1, stored.BoutID)
			}
			repo := NewFakeScoringRepository(stored)

			id := stored.ID
			if tt.useUnknownID {
				id = 999
			}

			out, err := scoring.NewScoringService(repo, NewTestBouts(), NewTestMemberships()).
				UpdateScoringByID(callerCtx(t, tt.caller), &scoring.ScoringUpdateInput{ID: id, Body: tt.body})

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
		caller       uuid.UUID // uuid.Nil means no caller
		seedRevoked  bool
		revokedBy    string
		useUnknownID bool
		wantCode     int
	}{
		{name: "marks the score as revoked", caller: TestRefereeID, revokedBy: referee},
		{name: "refuses an admin who is not the bout's referee", caller: TestAdminID, revokedBy: referee, wantCode: http.StatusForbidden},
		{name: "refuses a request with no caller", revokedBy: referee, wantCode: http.StatusForbidden},
		{name: "refuses a caller outside the tournament", caller: TestOutsiderID, revokedBy: referee, wantCode: http.StatusForbidden},
		{
			name:        "refuses a score that is already revoked",
			caller:      TestRefereeID,
			seedRevoked: true,
			revokedBy:   referee,
			wantCode:    http.StatusConflict,
		},
		{
			name:      "rejects a revoked_by that is not a uuid",
			caller:    TestRefereeID,
			revokedBy: "not-a-uuid",
			wantCode:  http.StatusBadRequest,
		},
		{
			name:         "reports an unknown id as not found",
			caller:       TestRefereeID,
			revokedBy:    referee,
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seeded(1, TestBoutID)
			if tt.seedRevoked {
				stored = seededRevoked(1, stored.BoutID)
			}
			repo := NewFakeScoringRepository(stored)

			id := stored.ID
			if tt.useUnknownID {
				id = 999
			}

			out, err := scoring.NewScoringService(repo, NewTestBouts(), NewTestMemberships()).RevokeScoring(callerCtx(t, tt.caller),
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

	match := TestBoutID
	service := scoring.NewScoringService(NewFakeScoringRepository(seeded(1, match)), NewTestBouts(), NewTestMemberships())

	_, err := service.RevokeScoring(callerCtx(t, TestRefereeID), &scoring.ScoringRevokeInput{
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

	_, err := scoring.NewScoringService(repo, NewFakeBoutLookup(), NewTestMemberships()).
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

			out, err := scoring.NewScoringService(repo, bouts, NewTestMemberships()).
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
