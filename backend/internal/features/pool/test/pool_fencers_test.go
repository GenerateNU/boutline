package test

import (
	"fmt"
	"net/http"
	"slices"
	"testing"
	"time"

	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// reseatFixture holds pool 1 (fencers 1-4, Strip 1, the referee) and pool 2 (fencers 5-7),
// created through batch create with 15 touches and 540 seconds so those rules can be
// seen surviving a re-seat.
type reseatFixture struct {
	*createFixture
	service pool.PoolService
	pool1   uuid.UUID
	pool2   uuid.UUID
}

func newReseatFixture(t *testing.T) *reseatFixture {
	t.Helper()

	f := &reseatFixture{createFixture: newCreateFixture()}
	f.updateStage(func(stage *poolstage.PoolStage) { stage.MaxCompetitorPerPool = 6 })
	f.service = pool.NewPoolService(f.repo, f.lookup)

	first := f.item(1, 1, 2, 3, 4)
	first.Strip = ptr("Strip 1")
	first.RefereeID = ptr(f.referee.String())
	body := f.body(first, f.item(2, 5, 6, 7))
	body.PointsToWin, body.TimeLimitSeconds = 15, 540

	out, err := f.service.CreatePools(t.Context(), &pool.PoolCreateInput{Body: body})
	require.NoError(t, err)
	f.pool1 = uuid.MustParse(out.Body.Data[0].ID)
	f.pool2 = uuid.MustParse(out.Body.Data[1].ID)
	f.repo.Tournaments[f.pool1] = f.tournament
	f.repo.Tournaments[f.pool2] = f.tournament

	return f
}

func (f *reseatFixture) patch(t *testing.T, id uuid.UUID, body pool.PoolUpdateBody) (*pool.PoolOutput, error) {
	t.Helper()

	return f.service.UpdatePoolByID(t.Context(), &pool.PoolUpdateInput{ID: id.String(), Body: body})
}

// seatedPairs is the bout order a pool of these fencers gets: seated by registration
// order, then paired by the standard table.
func seatedPairs(fencers ...int) [][2]uuid.UUID {
	seated := slices.Clone(fencers)
	slices.SortFunc(seated, func(a, b int) int { return registeredAt[a] - registeredAt[b] })

	pairs := make([][2]uuid.UUID, 0, len(poolBoutPairs[len(seated)]))
	for _, pair := range poolBoutPairs[len(seated)] {
		pairs = append(pairs, [2]uuid.UUID{competitor(seated[pair[0]-1]), competitor(seated[pair[1]-1])})
	}

	return pairs
}

func pairsOf(bouts []pool.PoolBout) [][2]uuid.UUID {
	pairs := make([][2]uuid.UUID, 0, len(bouts))
	for _, bout := range bouts {
		pairs = append(pairs, [2]uuid.UUID{bout.Competitor1ID, bout.Competitor2ID})
	}

	return pairs
}

func TestReseatPool(t *testing.T) {
	t.Parallel()

	locked := "a pool's fencers can only change before it starts and while every bout is upcoming"

	tests := []struct {
		name        string
		prepare     func(f *reseatFixture)
		body        pool.PoolUpdateBody
		unknownPool bool
		wantCode    int
		wantDetail  string
		wantFencers []int
		wantStrip   string
	}{
		{
			name:        "replaces the fencers and regenerates the bouts in seating order",
			body:        pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 8)},
			wantFencers: []int{1, 2, 3, 8},
			wantStrip:   "Strip 1",
		},
		{
			name:        "applies a strip change in the same patch to the new bouts",
			body:        pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 4), Strip: ptr("Strip 9")},
			wantFencers: []int{1, 2, 3, 4},
			wantStrip:   "Strip 9",
		},
		{
			name:       "refuses a fencer still seated in another pool of the stage",
			body:       pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 5)},
			wantCode:   http.StatusConflict,
			wantDetail: fmt.Sprintf("competitor %s is already in a pool of this pool stage", competitor(5)),
		},
		{
			name: "refuses once one of the pool's bouts has started",
			prepare: func(f *reseatFixture) {
				for i := range f.repo.Bouts {
					if f.repo.Bouts[i].PoolID == f.pool1 {
						f.repo.Bouts[i].Status = "active"

						break
					}
				}
			},
			body:       pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 8)},
			wantCode:   http.StatusConflict,
			wantDetail: locked,
		},
		{
			name: "refuses once the pool has started",
			prepare: func(f *reseatFixture) {
				started := f.repo.Pools[f.pool1]
				started.StartedAt = ptr(time.Now())
				f.repo.Pools[f.pool1] = started
			},
			body:       pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 8)},
			wantCode:   http.StatusConflict,
			wantDetail: locked,
		},
		{
			name:       "rejects more fencers than the stage allows",
			body:       pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 4, 8, 9, 10)},
			wantCode:   http.StatusBadRequest,
			wantDetail: "pool 1 must have between 2 and 6 fencers",
		},
		{
			name:        "reports an unknown pool as not found",
			body:        pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 8)},
			unknownPool: true,
			wantCode:    http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			f := newReseatFixture(t)
			if tt.prepare != nil {
				tt.prepare(f)
			}
			before := slices.Clone(f.repo.Bouts)

			target := f.pool1
			if tt.unknownPool {
				target = uuid.New()
			}
			out, err := f.patch(t, target, tt.body)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Contains(t, detail, tt.wantDetail)
				assert.Nil(t, out)
				assert.Equal(t, before, f.repo.Bouts, "a refused re-seat must not touch any bout")

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantStrip, *out.Body.Strip)

			bouts := boutsOf(f.repo, f.pool1.String())
			assert.Equal(t, seatedPairs(tt.wantFencers...), pairsOf(bouts))
			for k, bout := range bouts {
				assert.Equal(t, k+1, bout.GroupSlot)
				assert.Equal(t, tt.wantStrip, *bout.Location)
				assert.Equal(t, &f.referee, bout.RefereeID)
				assert.Equal(t, f.tournament, bout.TournamentID)
				assert.Equal(t, 1, bout.GroupNumber)
				assert.Equal(t, "upcoming", bout.Status)
				assert.Equal(t, 15, bout.PointsToWin, "the pool's bout rules survive a re-seat")
				assert.Equal(t, 540, bout.TimeLimitSeconds)
			}
			assert.Equal(t, seatedPairs(5, 6, 7), pairsOf(boutsOf(f.repo, f.pool2.String())), "other pools are untouched")
		})
	}
}

func TestReseatPoolMovesAFencerInTwoPatches(t *testing.T) {
	t.Parallel()

	f := newReseatFixture(t)

	_, err := f.patch(t, f.pool2, pool.PoolUpdateBody{Fencers: fencerIDs(6, 7)})
	require.NoError(t, err)
	_, err = f.patch(t, f.pool1, pool.PoolUpdateBody{Fencers: fencerIDs(1, 2, 3, 4, 5)})
	require.NoError(t, err)

	assert.Equal(t, seatedPairs(1, 2, 3, 4, 5), pairsOf(boutsOf(f.repo, f.pool1.String())))
	assert.Equal(t, seatedPairs(6, 7), pairsOf(boutsOf(f.repo, f.pool2.String())))
}
