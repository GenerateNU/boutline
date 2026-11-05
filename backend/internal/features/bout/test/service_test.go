package test

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"
	"time"

	"boutline/internal/features/bout"
	"boutline/internal/features/tournament"
	tournamentusertest "boutline/internal/features/tournamentuser/test"
	"boutline/internal/features/user"

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

func tooManyIDs() string {
	ids := make([]string, bout.BoutMaxIDs+1)
	for i := range ids {
		ids[i] = uuid.New().String()
	}

	return strings.Join(ids, ",")
}

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

	staff := tournamentusertest.NewStaff()
	activeTournament := seededTournament(tournament.TournamentStatusActive)
	activeTournament.ID = staff.TournamentID
	pendingTournament := seededTournament(tournament.TournamentStatusPending)
	endedTournament := seededTournament(tournament.TournamentStatusEnded)

	referee := staff.Referee.String()
	competitor1 := uuid.New().String()
	competitor2 := uuid.New().String()

	samePool := uuid.New()
	otherTournamentPool := uuid.New()
	pools := NewFakePoolLookup(map[uuid.UUID]uuid.UUID{
		samePool:            activeTournament.ID,
		otherTournamentPool: uuid.New(),
	})
	pooledInput := func(poolID string) *bout.BoutCreateInput {
		return &bout.BoutCreateInput{Body: bout.BoutCreateBody{
			TournamentID: activeTournament.ID.String(), PoolID: ptr(poolID),
			Competitor1ID: competitor1, Competitor2ID: competitor2, PointsToWin: 5,
		}}
	}

	tests := []struct {
		name        string
		lookup      *FakeTournamentLookup
		pools       *FakePoolLookup
		membersErr  error
		input       *bout.BoutCreateInput
		wantCode    int
		wantDetail  string
		wantNoBouts bool
	}{
		{
			name:   "lets a tournament admin referee",
			lookup: NewFakeTournamentLookup(activeTournament),
			input:  createInput(activeTournament.ID.String(), ptr(staff.Admin.String()), competitor1, competitor2, 11),
		},
		{
			name:        "rejects a referee who is not on the tournament's staff",
			lookup:      NewFakeTournamentLookup(activeTournament),
			input:       createInput(activeTournament.ID.String(), ptr(staff.Outsider.String()), competitor1, competitor2, 11),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "referee_id must reference a staff member of the tournament",
			wantNoBouts: true,
		},
		{
			name:        "reports a staff lookup failure as a server error",
			lookup:      NewFakeTournamentLookup(activeTournament),
			membersErr:  errors.New("connection refused"),
			input:       createInput(activeTournament.ID.String(), ptr(referee), competitor1, competitor2, 11),
			wantCode:    http.StatusInternalServerError,
			wantDetail:  "internal server error",
			wantNoBouts: true,
		},
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
			name:   "creates a bout inside a pool of its tournament",
			lookup: NewFakeTournamentLookup(activeTournament),
			pools:  pools,
			input:  pooledInput(samePool.String()),
		},
		{
			name:        "rejects a pool from another tournament",
			lookup:      NewFakeTournamentLookup(activeTournament),
			pools:       pools,
			input:       pooledInput(otherTournamentPool.String()),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "pool_id must reference a pool in the bout's tournament",
			wantNoBouts: true,
		},
		{
			name:        "rejects a pool that does not exist",
			lookup:      NewFakeTournamentLookup(activeTournament),
			pools:       pools,
			input:       pooledInput(uuid.New().String()),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "pool_id must reference an existing pool",
			wantNoBouts: true,
		},
		{
			name:        "reports a pool lookup failure as a server error",
			lookup:      NewFakeTournamentLookup(activeTournament),
			pools:       &FakePoolLookup{Err: errors.New("connection refused")},
			input:       pooledInput(samePool.String()),
			wantCode:    http.StatusInternalServerError,
			wantDetail:  "internal server error",
			wantNoBouts: true,
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
			name:        "rejects a bad pool_id",
			lookup:      NewFakeTournamentLookup(activeTournament),
			input:       pooledInput("not-a-uuid"),
			wantCode:    http.StatusBadRequest,
			wantDetail:  "pool_id must be a valid uuid",
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

			pools := tt.pools
			if pools == nil {
				pools = NewFakePoolLookup(nil)
			}

			members := staff.Lookup()
			members.Err = tt.membersErr

			repo := NewFakeBoutRepository()
			out, err := bout.NewBoutService(repo, tt.lookup, pools, members).CreateBout(t.Context(), tt.input)

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
			assert.Equal(t, tt.input.Body.PoolID, out.Body.PoolID)
			assert.Len(t, repo.Bouts, 1)
		})
	}
}

func TestListBouts(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	otherTournamentID := uuid.New()
	poolID := uuid.New()

	pooled := seededBout(bout.BoutStatusUpcoming, tournamentID)
	pooled.PoolID = &poolID

	mixed := []bout.Bout{
		pooled,
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
			name:      "filters by pool_id",
			seed:      mixed,
			input:     &bout.BoutListInput{PoolID: poolID.String()},
			wantTotal: 1,
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
		{
			name:     "rejects a bad pool_id",
			seed:     mixed,
			input:    &bout.BoutListInput{PoolID: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
		{
			name:      "filters to just the named ids",
			seed:      mixed,
			input:     &bout.BoutListInput{IDs: mixed[0].ID.String() + "," + mixed[1].ID.String()},
			wantTotal: 2,
			wantLimit: bout.BoutDefaultPageSize,
		},
		{
			name:      "combines ids with tournament_id",
			seed:      mixed,
			input:     &bout.BoutListInput{IDs: mixed[0].ID.String() + "," + mixed[2].ID.String(), TournamentID: tournamentID.String()},
			wantTotal: 1,
			wantLimit: bout.BoutDefaultPageSize,
		},
		{
			name:      "combines ids with status",
			seed:      mixed,
			input:     &bout.BoutListInput{IDs: mixed[0].ID.String() + "," + mixed[1].ID.String(), Status: bout.BoutStatusActive},
			wantTotal: 1,
			wantLimit: bout.BoutDefaultPageSize,
		},
		{
			name:      "an empty ids string returns everything unchanged",
			seed:      mixed,
			input:     &bout.BoutListInput{IDs: ""},
			wantTotal: 3,
			wantLimit: bout.BoutDefaultPageSize,
		},
		{
			name:     "rejects an invalid id in ids",
			seed:     mixed,
			input:    &bout.BoutListInput{IDs: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects more than the max number of ids",
			seed:     mixed,
			input:    &bout.BoutListInput{IDs: tooManyIDs()},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := bout.NewBoutService(NewFakeBoutRepository(tt.seed...), NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).
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

		out, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				PointsToWin: ptr(21),
			}})

		require.NoError(t, err)
		assert.Equal(t, 21, out.Body.PointsToWin)
		assert.Equal(t, 21, repo.Bouts[stored.ID].PointsToWin)
	})

	t.Run("moves an upcoming bout into a pool of its tournament", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)
		poolID := uuid.New()
		pools := NewFakePoolLookup(map[uuid.UUID]uuid.UUID{poolID: stored.TournamentID})

		out, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), pools, tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				PoolID: ptr(poolID.String()),
			}})

		require.NoError(t, err)
		assert.Equal(t, ptr(poolID.String()), out.Body.PoolID)
		assert.Equal(t, &poolID, repo.Bouts[stored.ID].PoolID)
	})

	t.Run("refuses a pool from another tournament", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)
		poolID := uuid.New()
		pools := NewFakePoolLookup(map[uuid.UUID]uuid.UUID{poolID: uuid.New()})

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), pools, tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				PoolID: ptr(poolID.String()),
			}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "pool_id must reference a pool in the bout's tournament", detail)
		assert.Nil(t, repo.Bouts[stored.ID].PoolID)
	})

	t.Run("reassigns the referee to another staff member", func(t *testing.T) {
		t.Parallel()

		staff := tournamentusertest.NewStaff()
		stored := seededBout(bout.BoutStatusUpcoming, staff.TournamentID)
		repo := NewFakeBoutRepository(stored)

		out, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), staff.Lookup()).
			UpdateBoutByID(t.Context(), &bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				RefereeID: ptr(staff.Admin.String()),
			}})

		require.NoError(t, err)
		assert.Equal(t, ptr(staff.Admin.String()), out.Body.RefereeID)
		assert.Equal(t, &staff.Admin, repo.Bouts[stored.ID].RefereeID)
	})

	t.Run("refuses a referee who is not on the tournament's staff", func(t *testing.T) {
		t.Parallel()

		staff := tournamentusertest.NewStaff()
		stored := seededBout(bout.BoutStatusUpcoming, staff.TournamentID)
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), staff.Lookup()).
			UpdateBoutByID(t.Context(), &bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				RefereeID: ptr(staff.Outsider.String()),
			}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "referee_id must reference a staff member of the tournament", detail)
		assert.Equal(t, stored.RefereeID, repo.Bouts[stored.ID].RefereeID)
	})

	t.Run("refuses to edit an active bout", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusActive, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{PointsToWin: ptr(21)}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an upcoming bout can be edited", detail)
	})

	t.Run("refuses to edit an ended bout", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusEnded, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{PointsToWin: ptr(21)}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, "only an upcoming bout can be edited", detail)
	})

	t.Run("refuses an empty patch", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "provide at least one field to update", detail)
	})

	t.Run("rejects a single competitor equal to the other stored competitor", func(t *testing.T) {
		t.Parallel()

		stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
		repo := NewFakeBoutRepository(stored)

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: stored.ID.String(), Body: bout.BoutUpdateBody{
				Competitor1ID: ptr(stored.Competitor2ID.String()),
			}})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "competitor_1_id and competitor_2_id must be different", detail)
	})

	t.Run("competitor changes on a tableau bout", func(t *testing.T) {
		t.Parallel()

		replacement := uuid.NewString()
		tests := []struct {
			name       string
			tableau    bool
			body       bout.BoutUpdateBody
			wantStatus int
		}{
			{"first competitor is refused", true, bout.BoutUpdateBody{Competitor1ID: &replacement}, http.StatusConflict},
			{"second competitor is refused", true, bout.BoutUpdateBody{Competitor2ID: &replacement}, http.StatusConflict},
			{"both competitors are refused", true, bout.BoutUpdateBody{Competitor1ID: &replacement, Competitor2ID: ptr(uuid.NewString())}, http.StatusConflict},
			{"other fields are still editable", true, bout.BoutUpdateBody{PointsToWin: ptr(21)}, http.StatusOK},
			{"a non-tableau bout can change competitors", false, bout.BoutUpdateBody{Competitor1ID: &replacement}, http.StatusOK},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				t.Parallel()

				stored := seededBout(bout.BoutStatusUpcoming, uuid.New())
				if tt.tableau {
					stored.DirectEliminationID = ptr(uuid.New())
				}
				repo := NewFakeBoutRepository(stored)

				_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
					&bout.BoutUpdateInput{ID: stored.ID.String(), Body: tt.body})

				if tt.wantStatus == http.StatusOK {
					require.NoError(t, err)
					return
				}
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantStatus, code)
				assert.Equal(t, "competitors of a tableau bout cannot be changed", detail)
				assert.Equal(t, stored.Competitor1ID, repo.Bouts[stored.ID].Competitor1ID)
			})
		}
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		repo := NewFakeBoutRepository()

		_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).UpdateBoutByID(t.Context(),
			&bout.BoutUpdateInput{ID: uuid.New().String(), Body: bout.BoutUpdateBody{PointsToWin: ptr(21)}})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestStartBout(t *testing.T) {
	t.Parallel()

	staff := tournamentusertest.NewStaff()
	activeTournament := seededTournament(tournament.TournamentStatusActive)
	activeTournament.ID = staff.TournamentID
	pendingTournament := seededTournament(tournament.TournamentStatusPending)
	endedTournament := seededTournament(tournament.TournamentStatusEnded)
	scheduled := time.Date(2026, 10, 1, 14, 0, 0, 0, time.UTC)

	tests := []struct {
		name        string
		tourney     tournament.Tournament
		status      bout.BoutStatus
		referee     *uuid.UUID
		caller      *uuid.UUID
		unknownID   bool
		wantCode    int
		wantDetail  string
		wantReferee *uuid.UUID
	}{
		{
			name:        "the assigned referee starts the bout",
			tourney:     activeTournament,
			referee:     &staff.Referee,
			caller:      &staff.Referee,
			wantReferee: &staff.Referee,
		},
		{
			name:        "a staff member who starts an unassigned bout becomes its referee",
			tourney:     activeTournament,
			caller:      &staff.Admin,
			wantReferee: &staff.Admin,
		},
		{
			name:       "refuses anyone but the assigned referee",
			tourney:    activeTournament,
			referee:    &staff.Referee,
			caller:     &staff.Admin,
			wantCode:   http.StatusForbidden,
			wantDetail: "only the bout's assigned referee can do this",
		},
		{
			name:       "refuses an unassigned bout to someone outside the staff",
			tourney:    activeTournament,
			caller:     &staff.Outsider,
			wantCode:   http.StatusForbidden,
			wantDetail: "only the tournament's staff can referee this bout",
		},
		{
			name:       "refuses a request with no caller",
			tourney:    activeTournament,
			referee:    &staff.Referee,
			wantCode:   http.StatusForbidden,
			wantDetail: "only the bout's assigned referee can do this",
		},
		{
			name:       "refuses to start a bout in a pending tournament",
			tourney:    pendingTournament,
			referee:    &staff.Referee,
			caller:     &staff.Referee,
			wantCode:   http.StatusConflict,
			wantDetail: "bouts can only be started in an active tournament",
		},
		{
			name:       "refuses to start a bout in an ended tournament",
			tourney:    endedTournament,
			referee:    &staff.Referee,
			caller:     &staff.Referee,
			wantCode:   http.StatusConflict,
			wantDetail: "bouts can only be started in an active tournament",
		},
		{
			name:       "refuses to start a bout that is already active",
			tourney:    activeTournament,
			status:     bout.BoutStatusActive,
			referee:    &staff.Referee,
			caller:     &staff.Referee,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming bout can be started",
		},
		{
			name:      "reports an unknown id as not found",
			tourney:   activeTournament,
			caller:    &staff.Referee,
			unknownID: true,
			wantCode:  http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			status := tt.status
			if status == "" {
				status = bout.BoutStatusUpcoming
			}
			stored := seededBout(status, tt.tourney.ID)
			stored.RefereeID = tt.referee
			stored.StartTime = &scheduled
			repo := NewFakeBoutRepository(stored)

			id := stored.ID.String()
			if tt.unknownID {
				id = uuid.New().String()
			}

			out, err := bout.NewBoutService(repo, NewFakeTournamentLookup(tt.tourney), NewFakePoolLookup(nil), staff.Lookup()).
				StartBout(callerContext(t, tt.caller), &bout.BoutIDInput{ID: id})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Equal(t, status, repo.Bouts[stored.ID].Status)
				assert.Equal(t, tt.referee, repo.Bouts[stored.ID].RefereeID)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, bout.BoutStatusActive, out.Body.Status)
			require.NotNil(t, out.Body.StartedAt)
			assert.WithinDuration(t, time.Now().UTC(), *out.Body.StartedAt, time.Minute)
			assert.Equal(t, &scheduled, out.Body.StartTime, "the scheduled start is kept")
			assert.Equal(t, tt.wantReferee, repo.Bouts[stored.ID].RefereeID)
		})
	}
}

func TestEndBout(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	other := uuid.New()

	tests := []struct {
		name       string
		status     bout.BoutStatus
		caller     *uuid.UUID
		unknownID  bool
		wantCode   int
		wantDetail string
	}{
		{name: "the assigned referee ends the bout", status: bout.BoutStatusActive, caller: &referee},
		{
			name:       "refuses anyone but the assigned referee",
			status:     bout.BoutStatusActive,
			caller:     &other,
			wantCode:   http.StatusForbidden,
			wantDetail: "only the bout's assigned referee can do this",
		},
		{
			name:       "refuses a request with no caller",
			status:     bout.BoutStatusActive,
			wantCode:   http.StatusForbidden,
			wantDetail: "only the bout's assigned referee can do this",
		},
		{
			name:       "refuses to end an upcoming bout",
			status:     bout.BoutStatusUpcoming,
			caller:     &referee,
			wantCode:   http.StatusConflict,
			wantDetail: "only an active bout can be ended",
		},
		{
			name:      "reports an unknown id as not found",
			status:    bout.BoutStatusActive,
			caller:    &referee,
			unknownID: true,
			wantCode:  http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededBout(tt.status, uuid.New())
			stored.RefereeID = &referee
			repo := NewFakeBoutRepository(stored)

			id := stored.ID.String()
			if tt.unknownID {
				id = uuid.New().String()
			}

			out, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).
				EndBout(callerContext(t, tt.caller), &bout.BoutIDInput{ID: id})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Equal(t, tt.status, repo.Bouts[stored.ID].Status)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, bout.BoutStatusEnded, out.Body.Status)
			require.NotNil(t, out.Body.CompletedAt)
			assert.WithinDuration(t, time.Now().UTC(), *out.Body.CompletedAt, time.Minute)
		})
	}
}

// callerContext stands in for the auth middleware, which puts the verified
// caller on every write request.
func callerContext(t *testing.T, caller *uuid.UUID) context.Context {
	t.Helper()

	if caller == nil {
		return t.Context()
	}

	return user.WithUserID(t.Context(), *caller)
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
		{name: "deletes an ended bout", status: bout.BoutStatusEnded},
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

			_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).
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

	_, err := bout.NewBoutService(repo, NewFakeTournamentLookup(), NewFakePoolLookup(nil), tournamentusertest.NewFakeMembershipLookup()).
		ListBouts(t.Context(), &bout.BoutListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
