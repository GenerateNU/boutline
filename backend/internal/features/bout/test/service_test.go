package test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/bout"
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

func seededBout(status bout.BoutStatus, tournamentID uuid.UUID) bout.Bout {
	return bout.Bout{
		ID:            uuid.New(),
		TournamentID:  tournamentID,
		RefereeID:     ptr(uuid.New()),
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

func createInput(tournamentID string, refereeID *string, competitor1ID, competitor2ID string, pointsToWin int) *bout.BoutCreateInput {
	return &bout.BoutCreateInput{
		Body: bout.BoutCreateBody{
			TournamentID:  tournamentID,
			RefereeID:     refereeID,
			Competitor1ID: competitor1ID,
			Competitor2ID: competitor2ID,
			PointsToWin:   pointsToWin,
		},
	}
}

func TestCreateBout(t *testing.T) {
	t.Parallel()

	activeTournament := seededTournament(tournament.TournamentStatusActive)
	pendingTournament := seededTournament(tournament.TournamentStatusPending)
	endedTournament := seededTournament(tournament.TournamentStatusEnd)

	referee := uuid.New().String()
	competitor1 := uuid.New().String()
	competitor2 := uuid.New().String()

	tests := []struct {
		name        string
		lookup      *FakeTournamentLookup
		input       *bout.BoutCreateInput
		wantCode    int
		wantDetail  string
		wantNoBouts bool
	}{
		{
			name:   "creates an upcoming bout in an active tournament",
			lookup: NewFakeTournamentLookup(activeTournament),
			input:  createInput(activeTournament.ID.String(), ptr(referee), competitor1, competitor2, 11),
		},
		{
			name:   "creates a bout with no referee assigned yet",
			lookup: NewFakeTournamentLookup(activeTournament),
			input:  createInput(activeTournament.ID.String(), nil, competitor1, competitor2, 11),
		},
		{
			name:        "rejects a tournament_id that does not exist",
			lookup:      NewFakeTournamentLookup(),
			input:       createInput(uuid.New().String(), ptr(referee), competitor1, competitor2, 11),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "tournament_id must reference an existing tournament",
			wantNoBouts: true,
		},
		{
			name:        "refuses a pending tournament",
			lookup:      NewFakeTournamentLookup(pendingTournament),
			input:       createInput(pendingTournament.ID.String(), ptr(referee), competitor1, competitor2, 11),
			wantCode:    http.StatusConflict,
			wantDetail:  "bouts can only be created in an active tournament",
			wantNoBouts: true,
		},
		{
			name:        "refuses an ended tournament",
			lookup:      NewFakeTournamentLookup(endedTournament),
			input:       createInput(endedTournament.ID.String(), ptr(referee), competitor1, competitor2, 11),
			wantCode:    http.StatusConflict,
			wantDetail:  "bouts can only be created in an active tournament",
			wantNoBouts: true,
		},
		{
			name:        "rejects identical competitors",
			lookup:      NewFakeTournamentLookup(activeTournament),
			input:       createInput(activeTournament.ID.String(), ptr(referee), competitor1, competitor1, 11),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "competitor_1_id and competitor_2_id must be different",
			wantNoBouts: true,
		},
		{
			name:        "rejects a non-positive points_to_win",
			lookup:      NewFakeTournamentLookup(activeTournament),
			input:       createInput(activeTournament.ID.String(), ptr(referee), competitor1, competitor2, 0),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "points_to_win must be greater than 0",
			wantNoBouts: true,
		},
		{
			name:   "rejects a non-positive time_limit_seconds",
			lookup: NewFakeTournamentLookup(activeTournament),
			input: &bout.BoutCreateInput{Body: bout.BoutCreateBody{
				TournamentID: activeTournament.ID.String(), RefereeID: ptr(referee),
				Competitor1ID: competitor1, Competitor2ID: competitor2,
				PointsToWin: 11, TimeLimitSeconds: ptr(0),
			}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "time_limit_seconds must be greater than 0",
			wantNoBouts: true,
		},
		{
			name:   "rejects a negative group_number",
			lookup: NewFakeTournamentLookup(activeTournament),
			input: &bout.BoutCreateInput{Body: bout.BoutCreateBody{
				TournamentID: activeTournament.ID.String(), RefereeID: ptr(referee),
				Competitor1ID: competitor1, Competitor2ID: competitor2,
				PointsToWin: 11, GroupNumber: -1,
			}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "group_number must not be negative",
			wantNoBouts: true,
		},
		{
			name:        "rejects a bad uuid",
			lookup:      NewFakeTournamentLookup(activeTournament),
			input:       createInput("not-a-uuid", ptr(referee), competitor1, competitor2, 11),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "tournament_id must be a valid uuid",
			wantNoBouts: true,
		},
		{
			name:        "reports a tournament lookup failure as a server error",
			lookup:      &FakeTournamentLookup{Err: errors.New("connection refused")},
			input:       createInput(activeTournament.ID.String(), ptr(referee), competitor1, competitor2, 11),
			wantCode:    http.StatusInternalServerError,
			wantDetail:  "internal server error",
			wantNoBouts: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeBoutRepository()
			out, err := bout.NewBoutService(repo, tt.lookup).CreateBout(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				if tt.wantNoBouts {
					assert.Empty(t, repo.Bouts)
				}

				return
			}

			require.NoError(t, err)
			assert.Equal(t, bout.BoutStatusUpcoming, out.Body.Status)
			assert.Len(t, repo.Bouts, 1)
		})
	}
}

func TestListBouts(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	otherTournamentID := uuid.New()

	mixed := []bout.Bout{
		seededBout(bout.BoutStatusUpcoming, tournamentID),
		seededBout(bout.BoutStatusActive, tournamentID),
		seededBout(bout.BoutStatusUpcoming, otherTournamentID),
	}

	tests := []struct {
		name      string
		seed      []bout.Bout
		input     *bout.BoutListInput
		wantTotal int64
		wantLimit int
		wantCode  int
	}{
		{
			name:      "filters by tournament_id",
			seed:      mixed,
			input:     &bout.BoutListInput{TournamentID: tournamentID.String()},
			wantTotal: 2,
			wantLimit: bout.BoutDefaultPageSize,
		},
		{
			name:      "filters by status",
			seed:      mixed,
			input:     &bout.BoutListInput{Status: bout.BoutStatusActive},
			wantTotal: 1,
			wantLimit: bout.BoutDefaultPageSize,
		},
		{
			name:      "clamps a limit above the maximum",
			seed:      mixed,
			input:     &bout.BoutListInput{Limit: 500},
			wantTotal: 3,
			wantLimit: bout.BoutMaxPageSize,
		},
		{
			name:     "rejects an unknown status",
			seed:     mixed,
			input:    &bout.BoutListInput{Status: bout.BoutStatus("nope")},
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a bad tournament_id",
			seed:     mixed,
			input:    &bout.BoutListInput{TournamentID: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := bout.NewBoutService(NewFakeBoutRepository(tt.seed...), NewFakeTournamentLookup()).
				ListBouts(t.Context(), tt.input)

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

func TestUpdateBoutByID(t *testing.T) {
	t.Parallel()

	t.Run("edits an upcoming bout", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)

		out, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				PointsToWin: ptr(21),
			}})

		require.NoError(t, err)
		assert.Equal(t, 21, out.Body.PointsToWin)
		assert.Equal(t, 21, repo.Bouts[stored.ID].PointsToWin)
	})

	t.Run("refuses to edit an active bout", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusActive, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{PointsToWin: ptr(21)}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an upcoming bout can be edited", detail)
	})

	t.Run("refuses to edit an ended bout", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusEnd, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{PointsToWin: ptr(21)}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an upcoming bout can be edited", detail)
	})

	t.Run("refuses an empty patch", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "provide at least one field to update", detail)
	})

	t.Run("rejects a single competitor equal to the other stored competitor", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				Competitor1ID: ptr(stored.Competitor2ID.String()),
			}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "competitor_1_id and competitor_2_id must be different", detail)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeBoutRepository()

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: uuid.New().String(), Body: bout.BoutUpdateBody{PointsToWin: ptr(21)}})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestStartBout(t *testing.T) {
	t.Parallel()

	t.Run("moves an upcoming bout to active and records the start time", func(t *testing.T) {
		t.Parallel()

		activeTournament := seededTournament(tournament.TournamentStatusActive)
		stored := seededBout(bout.BoutStatusUpcoming, activeTournament.ID)
		stored.StartTime = ptr(time.Date(2026, 10, 1, 14, 0, 0, 0, time.UTC))
		repo := NewFakeBoutRepository(stored)

		out, err := bout.NewBoutService(repo, NewFakeTournamentLookup(activeTournament)).
			StartBout(t.Context(), &bout.BoutIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Equal(t, bout.BoutStatusActive, out.Body.Status)
		require.NotNil(t, out.Body.StartedAt)
		assert.WithinDuration(t, time.Now().UTC(), *out.Body.StartedAt, time.Minute)
		assert.Equal(t, stored.StartTime, out.Body.StartTime, "the scheduled start is kept")
	})

	t.Run("refuses to start a bout with no referee assigned", func(t *testing.T) {
		t.Parallel()

		activeTournament := seededTournament(tournament.TournamentStatusActive)
		stored := seededBout(bout.BoutStatusUpcoming, activeTournament.ID)
		stored.RefereeID = nil
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(activeTournament)).
			StartBout(t.Context(), &bout.BoutIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "a referee must be assigned before the bout can start", detail)
		assert.Equal(t, bout.BoutStatusUpcoming, repo.Bouts[stored.ID].Status)
	})

	t.Run("refuses to start a bout in a pending tournament", func(t *testing.T) {
		t.Parallel()

		pendingTournament := seededTournament(tournament.TournamentStatusPending)
		stored := seededBout(bout.BoutStatusUpcoming, pendingTournament.ID)
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(pendingTournament)).
			StartBout(t.Context(), &bout.BoutIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "bouts can only be started in an active tournament", detail)
	})

	t.Run("refuses to start a bout in an ended tournament", func(t *testing.T) {
		t.Parallel()

		endedTournament := seededTournament(tournament.TournamentStatusEnd)
		stored := seededBout(bout.BoutStatusUpcoming, endedTournament.ID)
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(endedTournament)).
			StartBout(t.Context(), &bout.BoutIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "bouts can only be started in an active tournament", detail)
	})

	t.Run("refuses to start a bout that is already active", func(t *testing.T) {
		t.Parallel()

		activeTournament := seededTournament(tournament.TournamentStatusActive)
		stored := seededBout(bout.BoutStatusActive, activeTournament.ID)
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(activeTournament)).
			StartBout(t.Context(), &bout.BoutIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an upcoming bout can be started", detail)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeBoutRepository()

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).
			StartBout(t.Context(), &bout.BoutIDInput{ID: uuid.New().String()})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestEndBout(t *testing.T) {
	t.Parallel()

	t.Run("moves an active bout to end", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusActive, uuid.New())
		repo := NewFakeBoutRepository(stored)

		out, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).
			EndBout(t.Context(), &bout.BoutIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Equal(t, bout.BoutStatusEnd, out.Body.Status)
		require.NotNil(t, out.Body.CompletedAt)
		assert.WithinDuration(t, time.Now().UTC(), *out.Body.CompletedAt, time.Minute)
	})

	t.Run("refuses to end an upcoming bout", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).
			EndBout(t.Context(), &bout.BoutIDInput{ID: stored.ID.String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an active bout can be ended", detail)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeBoutRepository()

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).
			EndBout(t.Context(), &bout.BoutIDInput{ID: uuid.New().String()})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestDeleteBoutByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		status     bout.BoutStatus
		unknownID  bool
		wantCode   int
		wantDetail string
	}{
		{name: "deletes an upcoming bout", status: bout.BoutStatusUpcoming},
		{name: "deletes an ended bout", status: bout.BoutStatusEnd},
		{
			name:       "refuses to delete an active bout",
			status:     bout.BoutStatusActive,
			wantCode:   http.StatusConflict,
			wantDetail: "an active bout cannot be deleted",
		},
		{
			name:      "reports an unknown id as not found",
			status:    bout.BoutStatusUpcoming,
			unknownID: true,
			wantCode:  http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededBout(tt.status, uuid.New())
			repo := NewFakeBoutRepository(stored)
			id := stored.ID
			if tt.unknownID {
				id = uuid.New()
			}

			_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).
				DeleteBoutByID(t.Context(), &bout.BoutIDInput{ID: id.String()})

			if tt.wantCode == 0 {
				require.NoError(t, err)
				assert.NotContains(t, repo.Bouts, stored.ID)
				return
			}

			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantCode, code)
			if tt.wantDetail != "" {
				assert.Equal(t, tt.wantDetail, detail)
			}
			assert.Contains(t, repo.Bouts, stored.ID)
		})
	}
}

func TestBoutRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeBoutRepository()
	repo.Err = errors.New("connection refused")

	_, err := bout.NewBoutService(repo, NewFakeTournamentLookup()).
		ListBouts(t.Context(), &bout.BoutListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
