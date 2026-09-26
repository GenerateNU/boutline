package test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/match"
	"boutline/internal/features/tournament"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seededTournament(status tournament.TournamentStatus) tournament.Tournament {
	return tournament.Tournament{
		ID:         uuid.New(),
		Name:       "bracket",
		Visibility: tournament.TournamentVisibilityPrivate,
		Code:       "ABCDEF",
		Status:     status,
		CreatedBy:  uuid.New(),
	}
}

func seededMatch(status match.MatchStatus, tournamentID uuid.UUID) match.Match {
	return match.Match{
		ID:            uuid.New(),
		TournamentID:  tournamentID,
		RefereeID:     uuid.New(),
		PointsToWin:   11,
		Status:        status,
		Competitor1ID: uuid.New(),
		Competitor2ID: uuid.New(),
	}
}

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func ptr[T any](v T) *T { return &v }

func createInput(tournamentID, refereeID, competitor1ID, competitor2ID string, pointsToWin int) *match.MatchCreateInput {
	return &match.MatchCreateInput{
		Body: match.MatchCreateBody{
			TournamentID:  tournamentID,
			RefereeID:     refereeID,
			Competitor1ID: competitor1ID,
			Competitor2ID: competitor2ID,
			PointsToWin:   pointsToWin,
		},
	}
}

func TestCreateMatch(t *testing.T) {
	t.Parallel()

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	pendingTournament := seededTournament(tournament.TournamentStatusPending)
	endedTournament := seededTournament(tournament.TournamentStatusEnd)

	referee := uuid.New().String()
	competitor1 := uuid.New().String()
	competitor2 := uuid.New().String()

	tests := []struct {
		name          string
		lookup        *FakeTournamentLookup
		input         *match.MatchCreateInput
		wantCode      int
		wantDetail    string
		wantNoMatches bool
	}{
		{
			name:   "creates a pending match in an active tournament",
			lookup: NewFakeTournamentLookup(activeTournament),
			input:  createInput(activeTournament.ID.String(), referee, competitor1, competitor2, 11),
		},
		{
			name:          "rejects a tournament_id that does not exist",
			lookup:        NewFakeTournamentLookup(),
			input:         createInput(uuid.New().String(), referee, competitor1, competitor2, 11),
			wantCode:      http.StatusBadRequest,
			wantDetail:    "tournament_id must reference an existing tournament",
			wantNoMatches: true,
		},
		{
			name:          "refuses a pending tournament",
			lookup:        NewFakeTournamentLookup(pendingTournament),
			input:         createInput(pendingTournament.ID.String(), referee, competitor1, competitor2, 11),
			wantCode:      http.StatusConflict,
			wantDetail:    "matches can only be created in an active tournament",
			wantNoMatches: true,
		},
		{
			name:          "refuses an ended tournament",
			lookup:        NewFakeTournamentLookup(endedTournament),
			input:         createInput(endedTournament.ID.String(), referee, competitor1, competitor2, 11),
			wantCode:      http.StatusConflict,
			wantDetail:    "matches can only be created in an active tournament",
			wantNoMatches: true,
		},
		{
			name:          "rejects identical competitors",
			lookup:        NewFakeTournamentLookup(activeTournament),
			input:         createInput(activeTournament.ID.String(), referee, competitor1, competitor1, 11),
			wantCode:      http.StatusBadRequest,
			wantDetail:    "competitor_1_id and competitor_2_id must be different",
			wantNoMatches: true,
		},
		{
			name:          "rejects a non-positive points_to_win",
			lookup:        NewFakeTournamentLookup(activeTournament),
			input:         createInput(activeTournament.ID.String(), referee, competitor1, competitor2, 0),
			wantCode:      http.StatusBadRequest,
			wantDetail:    "points_to_win must be greater than 0",
			wantNoMatches: true,
		},
		{
			name:   "rejects a non-positive time_limit_seconds",
			lookup: NewFakeTournamentLookup(activeTournament),
			input: &match.MatchCreateInput{Body: match.MatchCreateBody{
				TournamentID: activeTournament.ID.String(), RefereeID: referee,
				Competitor1ID: competitor1, Competitor2ID: competitor2,
				PointsToWin: 11, TimeLimitSeconds: ptr(0),
			}},
			wantCode:      http.StatusBadRequest,
			wantDetail:    "time_limit_seconds must be greater than 0",
			wantNoMatches: true,
		},
		{
			name:   "rejects a negative group_number",
			lookup: NewFakeTournamentLookup(activeTournament),
			input: &match.MatchCreateInput{Body: match.MatchCreateBody{
				TournamentID: activeTournament.ID.String(), RefereeID: referee,
				Competitor1ID: competitor1, Competitor2ID: competitor2,
				PointsToWin: 11, GroupNumber: -1,
			}},
			wantCode:      http.StatusBadRequest,
			wantDetail:    "group_number must not be negative",
			wantNoMatches: true,
		},
		{
			name:          "rejects a bad uuid",
			lookup:        NewFakeTournamentLookup(activeTournament),
			input:         createInput("not-a-uuid", referee, competitor1, competitor2, 11),
			wantCode:      http.StatusBadRequest,
			wantDetail:    "tournament_id must be a valid uuid",
			wantNoMatches: true,
		},
		{
			name:          "reports a tournament lookup failure as a server error",
			lookup:        &FakeTournamentLookup{Err: errors.New("connection refused")},
			input:         createInput(activeTournament.ID.String(), referee, competitor1, competitor2, 11),
			wantCode:      http.StatusInternalServerError,
			wantDetail:    "internal server error",
			wantNoMatches: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeMatchRepository()
			out, err := match.NewMatchService(repo, tt.lookup).CreateMatch(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				if tt.wantNoMatches {
					assert.Empty(t, repo.Matches)
				}

				return
			}

			require.NoError(t, err)
			assert.Equal(t, match.MatchStatusPending, out.Body.Status)
			assert.Len(t, repo.Matches, 1)
		})
	}
}

func TestListMatches(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	otherTournamentID := uuid.New()

	mixed := []match.Match{
		seededMatch(match.MatchStatusPending, tournamentID),
		seededMatch(match.MatchStatusActive, tournamentID),
		seededMatch(match.MatchStatusPending, otherTournamentID),
	}

	tests := []struct {
		name      string
		seed      []match.Match
		input     *match.MatchListInput
		wantTotal int64
		wantLimit int
		wantCode  int
	}{
		{
			name:      "filters by tournament_id",
			seed:      mixed,
			input:     &match.MatchListInput{TournamentID: tournamentID.String()},
			wantTotal: 2,
			wantLimit: match.MatchDefaultPageSize,
		},
		{
			name:      "filters by status",
			seed:      mixed,
			input:     &match.MatchListInput{Status: match.MatchStatusActive},
			wantTotal: 1,
			wantLimit: match.MatchDefaultPageSize,
		},
		{
			name:      "clamps a limit above the maximum",
			seed:      mixed,
			input:     &match.MatchListInput{Limit: 500},
			wantTotal: 3,
			wantLimit: match.MatchMaxPageSize,
		},
		{
			name:     "rejects an unknown status",
			seed:     mixed,
			input:    &match.MatchListInput{Status: match.MatchStatus("nope")},
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a bad tournament_id",
			seed:     mixed,
			input:    &match.MatchListInput{TournamentID: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := match.NewMatchService(NewFakeMatchRepository(tt.seed...), NewFakeTournamentLookup()).
				ListMatches(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
		})
	}
}

func TestUpdateMatchByID(t *testing.T) {
	t.Parallel()

	t.Run("edits a pending match", func(t *testing.T) {
		t.Parallel()

		stored := seededMatch(match.MatchStatusPending, uuid.New())
		repo := NewFakeMatchRepository(stored)

		out, err := match.NewMatchService(repo, NewFakeTournamentLookup()).UpdateMatchByID(t.Context(),
			&match.MatchUpdateInput{ID: stored.ID.String(), Body: match.MatchUpdateBody{
				PointsToWin: ptr(21),
			}})

		require.NoError(t, err)
		assert.Equal(t, 21, out.Body.PointsToWin)
		assert.Equal(t, 21, repo.Matches[stored.ID].PointsToWin)
	})

	t.Run("refuses to edit an active match", func(t *testing.T) {
		t.Parallel()

		stored := seededMatch(match.MatchStatusActive, uuid.New())
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).UpdateMatchByID(t.Context(),
			&match.MatchUpdateInput{ID: stored.ID.String(), Body: match.MatchUpdateBody{PointsToWin: ptr(21)}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only a pending match can be edited", detail)
	})

	t.Run("refuses to edit an ended match", func(t *testing.T) {
		t.Parallel()

		stored := seededMatch(match.MatchStatusEnd, uuid.New())
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).UpdateMatchByID(t.Context(),
			&match.MatchUpdateInput{ID: stored.ID.String(), Body: match.MatchUpdateBody{PointsToWin: ptr(21)}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only a pending match can be edited", detail)
	})

	t.Run("refuses an empty patch", func(t *testing.T) {
		t.Parallel()

		stored := seededMatch(match.MatchStatusPending, uuid.New())
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).UpdateMatchByID(t.Context(),
			&match.MatchUpdateInput{ID: stored.ID.String(), Body: match.MatchUpdateBody{}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "provide at least one field to update", detail)
	})

	t.Run("rejects a single competitor equal to the other stored competitor", func(t *testing.T) {
		t.Parallel()

		stored := seededMatch(match.MatchStatusPending, uuid.New())
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).UpdateMatchByID(t.Context(),
			&match.MatchUpdateInput{ID: stored.ID.String(), Body: match.MatchUpdateBody{
				Competitor1ID: ptr(stored.Competitor2ID.String()),
			}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "competitor_1_id and competitor_2_id must be different", detail)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeMatchRepository()

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).UpdateMatchByID(t.Context(),
			&match.MatchUpdateInput{ID: uuid.New().String(), Body: match.MatchUpdateBody{PointsToWin: ptr(21)}})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestStartMatch(t *testing.T) {
	t.Parallel()

	t.Run("moves a pending match to active and records the start time", func(t *testing.T) {
		t.Parallel()

		activeTournament := seededTournament(tournament.TournamentStatusActive)
		stored := seededMatch(match.MatchStatusPending, activeTournament.ID)
		repo := NewFakeMatchRepository(stored)

		out, err := match.NewMatchService(repo, NewFakeTournamentLookup(activeTournament)).
			StartMatch(t.Context(), &match.MatchIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Equal(t, match.MatchStatusActive, out.Body.Status)
		require.NotNil(t, out.Body.Time)
		assert.WithinDuration(t, time.Now().UTC(), *out.Body.Time, time.Minute)
	})

	t.Run("refuses to start a match in a pending tournament", func(t *testing.T) {
		t.Parallel()

		pendingTournament := seededTournament(tournament.TournamentStatusPending)
		stored := seededMatch(match.MatchStatusPending, pendingTournament.ID)
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup(pendingTournament)).
			StartMatch(t.Context(), &match.MatchIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "matches can only be started in an active tournament", detail)
	})

	t.Run("refuses to start a match in an ended tournament", func(t *testing.T) {
		t.Parallel()

		endedTournament := seededTournament(tournament.TournamentStatusEnd)
		stored := seededMatch(match.MatchStatusPending, endedTournament.ID)
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup(endedTournament)).
			StartMatch(t.Context(), &match.MatchIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "matches can only be started in an active tournament", detail)
	})

	t.Run("refuses to start a match that is already active", func(t *testing.T) {
		t.Parallel()

		activeTournament := seededTournament(tournament.TournamentStatusActive)
		stored := seededMatch(match.MatchStatusActive, activeTournament.ID)
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup(activeTournament)).
			StartMatch(t.Context(), &match.MatchIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only a pending match can be started", detail)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeMatchRepository()

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).
			StartMatch(t.Context(), &match.MatchIDInput{ID: uuid.New().String()})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestEndMatch(t *testing.T) {
	t.Parallel()

	t.Run("moves an active match to end", func(t *testing.T) {
		t.Parallel()

		stored := seededMatch(match.MatchStatusActive, uuid.New())
		repo := NewFakeMatchRepository(stored)

		out, err := match.NewMatchService(repo, NewFakeTournamentLookup()).
			EndMatch(t.Context(), &match.MatchIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Equal(t, match.MatchStatusEnd, out.Body.Status)
	})

	t.Run("refuses to end a pending match", func(t *testing.T) {
		t.Parallel()

		stored := seededMatch(match.MatchStatusPending, uuid.New())
		repo := NewFakeMatchRepository(stored)

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).
			EndMatch(t.Context(), &match.MatchIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an active match can be ended", detail)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeMatchRepository()

		_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).
			EndMatch(t.Context(), &match.MatchIDInput{ID: uuid.New().String()})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestDeleteMatchByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		status     match.MatchStatus
		unknownID  bool
		wantCode   int
		wantDetail string
	}{
		{name: "deletes a pending match", status: match.MatchStatusPending},
		{name: "deletes an ended match", status: match.MatchStatusEnd},
		{
			name:       "refuses to delete an active match",
			status:     match.MatchStatusActive,
			wantCode:   http.StatusConflict,
			wantDetail: "an active match cannot be deleted",
		},
		{
			name:      "reports an unknown id as not found",
			status:    match.MatchStatusPending,
			unknownID: true,
			wantCode:  http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededMatch(tt.status, uuid.New())
			repo := NewFakeMatchRepository(stored)
			id := stored.ID
			if tt.unknownID {
				id = uuid.New()
			}

			_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).
				DeleteMatchByID(t.Context(), &match.MatchIDInput{ID: id.String()})

			if tt.wantCode == 0 {
				require.NoError(t, err)
				assert.NotContains(t, repo.Matches, stored.ID)
				return
			}

			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantCode, code)
			if tt.wantDetail != "" {
				assert.Equal(t, tt.wantDetail, detail)
			}
			assert.Contains(t, repo.Matches, stored.ID)
		})
	}
}

func TestMatchRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeMatchRepository()
	repo.Err = errors.New("connection refused")

	_, err := match.NewMatchService(repo, NewFakeTournamentLookup()).
		ListMatches(t.Context(), &match.MatchListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
