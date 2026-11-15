package test

import (
	"context"
	"math/rand/v2"
	"net/http"
	"testing"

	"boutline/internal/features/directelimination"
	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"
	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/session"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	generateDEID         = uuid.MustParse("e0000000-0000-4000-8000-000000000001")
	generateEventID      = uuid.MustParse("e0000000-0000-4000-8000-000000000002")
	generateTournamentID = uuid.MustParse("e0000000-0000-4000-8000-000000000003")
	generateAdminID      = uuid.MustParse("e0000000-0000-4000-8000-000000000004")
	generateRefereeID    = uuid.MustParse("e0000000-0000-4000-8000-000000000005")
	generateStrangerID   = uuid.MustParse("e0000000-0000-4000-8000-000000000006")
)

// generateStandings has fencer i beat every fencer j > i 5-0, so fencer k ranks k-th.
func generateStandings(n int) ([]pool.PoolSheetFencerRow, []pool.PoolSheetBoutRow) {
	poolID := uuid.New()
	fencers := make([]pool.PoolSheetFencerRow, 0, n)
	for i := 1; i <= n; i++ {
		fencers = append(fencers, pool.PoolSheetFencerRow{PoolID: poolID, CompetitorID: drawID(i), Position: i})
	}

	var bouts []pool.PoolSheetBoutRow
	for i := 1; i <= n; i++ {
		for j := i + 1; j <= n; j++ {
			bouts = append(bouts, pool.PoolSheetBoutRow{
				ID: uuid.New(), PoolID: poolID, Status: "ended",
				Competitor1ID: drawID(i), Competitor2ID: drawID(j),
				Competitor1Score: 5, Competitor2Score: 0,
			})
		}
	}

	return fencers, bouts
}

type generateScenario struct {
	repo   *fakeDrawRepository
	caller *uuid.UUID
}

func newGenerateScenario(fencerCount int) *generateScenario {
	fencers, bouts := generateStandings(fencerCount)
	caller := generateAdminID

	return &generateScenario{
		caller: &caller,
		repo: &fakeDrawRepository{
			locked: map[uuid.UUID]directelimination.LockedDirectElimination{
				generateDEID: {
					Status:           directelimination.DirectEliminationStatusUpcoming,
					EventID:          generateEventID,
					TournamentID:     generateTournamentID,
					TournamentStatus: tournament.TournamentStatusActive,
				},
			},
			poolStage:    &poolstage.PoolStage{ID: uuid.New(), EventID: generateEventID, Status: poolstage.PoolStageStatusEnded},
			standFencers: fencers,
			standBouts:   bouts,
		},
	}
}

func (s *generateScenario) lockedDE(change func(*directelimination.LockedDirectElimination)) {
	de := s.repo.locked[generateDEID]
	change(&de)
	s.repo.locked[generateDEID] = de
}

func (s *generateScenario) generate(
	id string,
	body directelimination.DirectEliminationGenerateBody,
) (*directelimination.DirectEliminationDrawOutput, error) {
	memberships := fakeMemberships{
		{TournamentID: generateTournamentID, UserID: generateAdminID, Role: tournamentuser.TournamentUserRoleAdmin},
		{TournamentID: generateTournamentID, UserID: generateRefereeID, Role: tournamentuser.TournamentUserRoleReferee},
	}
	service := directelimination.NewDrawService(s.repo, memberships, func() *rand.Rand { return fixedRNG() })

	ctx := context.Background()
	if s.caller != nil {
		ctx = session.WithUserID(ctx, *s.caller)
	}

	return service.GenerateDirectElimination(ctx, &directelimination.DirectEliminationGenerateInput{ID: id, Body: body})
}

func TestGenerateDirectEliminationErrors(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		fencers     int
		id          string
		setup       func(*generateScenario)
		wantStatus  int
		wantMessage string
	}{
		{
			name: "malformed id", fencers: 12, id: "nope",
			wantStatus: http.StatusBadRequest, wantMessage: "id must be a valid uuid",
		},
		{
			name: "unknown direct elimination", fencers: 12, id: uuid.NewString(),
			wantStatus: http.StatusNotFound, wantMessage: "not found",
		},
		{
			name: "no caller", fencers: 12,
			setup:      func(s *generateScenario) { s.caller = nil },
			wantStatus: http.StatusForbidden, wantMessage: "this requires the admin role in the tournament",
		},
		{
			name: "referee", fencers: 12,
			setup:      func(s *generateScenario) { s.caller = &generateRefereeID },
			wantStatus: http.StatusForbidden, wantMessage: "this requires the admin role in the tournament",
		},
		{
			name: "non-member", fencers: 12,
			setup:      func(s *generateScenario) { s.caller = &generateStrangerID },
			wantStatus: http.StatusForbidden, wantMessage: "this requires the admin role in the tournament",
		},
		{
			name: "moved to another tournament after the role check", fencers: 12,
			setup: func(s *generateScenario) {
				s.repo.staleTournamentIDs = map[uuid.UUID]uuid.UUID{generateDEID: generateTournamentID}
				s.lockedDE(func(de *directelimination.LockedDirectElimination) { de.TournamentID = uuid.New() })
			},
			wantStatus: http.StatusConflict, wantMessage: "the direct elimination moved to another tournament; try again",
		},
		{
			name: "direct elimination active", fencers: 12,
			setup: func(s *generateScenario) {
				s.lockedDE(func(de *directelimination.LockedDirectElimination) {
					de.Status = directelimination.DirectEliminationStatusActive
				})
			},
			wantStatus: http.StatusConflict, wantMessage: "only an upcoming direct elimination can be drawn",
		},
		{
			name: "entries already exist", fencers: 12,
			setup: func(s *generateScenario) {
				s.repo.entries = []directelimination.DrawEntry{{DirectEliminationID: generateDEID, CompetitorID: drawID(1), Seed: 1}}
			},
			wantStatus: http.StatusConflict, wantMessage: "the tableau has already been drawn",
		},
		{
			name: "tournament not active", fencers: 12,
			setup: func(s *generateScenario) {
				s.lockedDE(func(de *directelimination.LockedDirectElimination) {
					de.TournamentStatus = tournament.TournamentStatusPending
				})
			},
			wantStatus: http.StatusConflict, wantMessage: "a tableau can only be drawn in an active tournament",
		},
		{
			name: "no pool stage", fencers: 12,
			setup:      func(s *generateScenario) { s.repo.poolStage = nil },
			wantStatus: http.StatusConflict, wantMessage: "the event's pool stage must end before the tableau can be drawn",
		},
		{
			name: "pool stage active", fencers: 12,
			setup:      func(s *generateScenario) { s.repo.poolStage.Status = poolstage.PoolStageStatusActive },
			wantStatus: http.StatusConflict, wantMessage: "the event's pool stage must end before the tableau can be drawn",
		},
		{
			name: "single fencer", fencers: 1,
			wantStatus: http.StatusBadRequest, wantMessage: "at least 2 fencers must advance to draw a tableau",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			scenario := newGenerateScenario(tt.fencers)
			if tt.setup != nil {
				tt.setup(scenario)
			}
			id := tt.id
			if id == "" {
				id = generateDEID.String()
			}
			baseEntries := len(scenario.repo.entries)

			_, err := scenario.generate(id, directelimination.DirectEliminationGenerateBody{})

			status, message := directEliminationAPIError(t, err)
			assert.Equal(t, tt.wantStatus, status)
			assert.Equal(t, tt.wantMessage, message)
			assert.Len(t, scenario.repo.entries, baseEntries)
			assert.Empty(t, scenario.repo.bouts)
		})
	}
}

func TestGenerateDirectEliminationDrawsTwelveFencers(t *testing.T) {
	t.Parallel()

	scenario := newGenerateScenario(12)

	out, err := scenario.generate(generateDEID.String(), directelimination.DirectEliminationGenerateBody{
		PointsToWin: 10, TimeLimitSeconds: 120,
	})

	require.NoError(t, err)
	require.Len(t, scenario.repo.entries, 12)
	for i, entry := range scenario.repo.entries {
		assert.Equal(t, i+1, entry.Seed)
		assert.Equal(t, drawID(i+1), entry.CompetitorID)
		assert.Equal(t, generateDEID, entry.DirectEliminationID)
	}

	wantSlots := [][3]int{{2, 8, 9}, {4, 5, 12}, {6, 7, 10}, {8, 6, 11}}
	require.Len(t, scenario.repo.bouts, len(wantSlots))
	for i, want := range wantSlots {
		bout := scenario.repo.bouts[i]
		assert.Equal(t, 16, bout.RoundSize)
		assert.Equal(t, want[0], bout.Slot)
		assert.Equal(t, drawID(want[1]), bout.Competitor1ID)
		assert.Equal(t, drawID(want[2]), bout.Competitor2ID)
		assert.Equal(t, 10, bout.PointsToWin)
		assert.Equal(t, 120, bout.TimeLimitSeconds)
		assert.Equal(t, generateTournamentID, bout.TournamentID)
		assert.Equal(t, "upcoming", bout.Status)
		assert.NotEqual(t, uuid.Nil, bout.ID)
	}

	assert.Equal(t, generateDEID.String(), out.Body.DirectEliminationID)
	assert.Equal(t, 16, out.Body.BracketSize)
	require.Len(t, out.Body.Entries, 12)
	require.Len(t, out.Body.Bouts, 4)
	for i, entry := range out.Body.Entries {
		assert.Equal(t, scenario.repo.entries[i].CompetitorID.String(), entry.CompetitorID)
		assert.Equal(t, scenario.repo.entries[i].Seed, entry.Seed)
	}
	for i, bout := range out.Body.Bouts {
		stored := scenario.repo.bouts[i]
		assert.Equal(t, stored.ID.String(), bout.ID)
		assert.Equal(t, stored.RoundSize, bout.RoundSize)
		assert.Equal(t, stored.Slot, bout.Slot)
		assert.Equal(t, stored.Competitor1ID.String(), bout.Competitor1ID)
		assert.Equal(t, stored.Competitor2ID.String(), bout.Competitor2ID)
	}
}

func TestGenerateDirectEliminationDefaults(t *testing.T) {
	t.Parallel()

	scenario := newGenerateScenario(12)

	_, err := scenario.generate(generateDEID.String(), directelimination.DirectEliminationGenerateBody{})

	require.NoError(t, err)
	require.Len(t, scenario.repo.entries, 12)
	require.NotEmpty(t, scenario.repo.bouts)
	for _, bout := range scenario.repo.bouts {
		assert.Equal(t, 15, bout.PointsToWin)
		assert.Equal(t, 180, bout.TimeLimitSeconds)
	}
}

func TestGenerateDirectEliminationAdvancePercent(t *testing.T) {
	t.Parallel()

	scenario := newGenerateScenario(10)

	_, err := scenario.generate(generateDEID.String(), directelimination.DirectEliminationGenerateBody{AdvancePercent: 80})

	require.NoError(t, err)
	assert.Len(t, scenario.repo.entries, 8)
}

func TestGenerateDirectEliminationTwiceIsAConflict(t *testing.T) {
	t.Parallel()

	scenario := newGenerateScenario(12)
	_, err := scenario.generate(generateDEID.String(), directelimination.DirectEliminationGenerateBody{})
	require.NoError(t, err)

	_, err = scenario.generate(generateDEID.String(), directelimination.DirectEliminationGenerateBody{})

	status, message := directEliminationAPIError(t, err)
	assert.Equal(t, http.StatusConflict, status)
	assert.Equal(t, "the tableau has already been drawn", message)
	assert.Len(t, scenario.repo.entries, 12)
	assert.Len(t, scenario.repo.bouts, 4)
}
