package test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/pool"
	"boutline/internal/features/poolstage"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seededPoolStage() poolstage.PoolStage {
	return poolstage.PoolStage{
		ID:                   uuid.New(),
		EventID:              uuid.New(),
		MaxCompetitorPerPool: 4,
		Status:               poolstage.PoolStageStatusUpcoming,
	}
}

func seededPool(poolStageID uuid.UUID) pool.Pool {
	return pool.Pool{ID: uuid.New(), PoolStageID: poolStageID}
}

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func ptr[T any](v T) *T { return &v }

// competitor returns a deterministic id whose bytewise order follows n.
func competitor(n int) uuid.UUID { return uuid.UUID{15: byte(n)} }

// registeredAt gives each registered competitor a created_at; the resulting order differs
// from both the id order and the order the tests request fencers in.
var registeredAt = []int{0, 3, 1, 4, 2, 7, 5, 6, 9, 8, 10}

type createFixture struct {
	stage      poolstage.PoolStage
	otherStage poolstage.PoolStage
	tournament uuid.UUID
	referee    uuid.UUID
	repo       *FakePoolRepository
	lookup     *FakePoolStageLookup
}

func newCreateFixture() *createFixture {
	f := &createFixture{
		stage:      seededPoolStage(),
		otherStage: seededPoolStage(),
		tournament: uuid.New(),
		referee:    uuid.New(),
		repo:       NewFakePoolRepository(),
	}
	f.lookup = NewFakePoolStageLookup(f.stage, f.otherStage)
	f.repo.StageTournaments[f.stage.ID] = f.tournament

	base := time.Date(2026, 10, 1, 8, 0, 0, 0, time.UTC)
	for n := 1; n < len(registeredAt); n++ {
		f.repo.Competitors[competitor(n)] = base.Add(time.Duration(registeredAt[n]) * time.Minute)
	}

	return f
}

func (f *createFixture) updateStage(change func(*poolstage.PoolStage)) {
	change(&f.stage)
	f.lookup.PoolStages[f.stage.ID] = f.stage
}

func (f *createFixture) item(number int, fencers ...int) pool.PoolCreateItem {
	return pool.PoolCreateItem{PoolStageID: f.stage.ID.String(), Number: number, Fencers: fencerIDs(fencers...)}
}

func (f *createFixture) body(items ...pool.PoolCreateItem) pool.PoolCreateBody {
	return pool.PoolCreateBody{Pools: items, PointsToWin: 5, TimeLimitSeconds: 180}
}

// seedPool stores a pool whose fencers already have bouts, so they count as seated.
func (f *createFixture) seedPool(stageID uuid.UUID, number int, fencers ...int) {
	seeded := pool.Pool{ID: uuid.New(), PoolStageID: stageID, Number: number}
	f.repo.Pools[seeded.ID] = seeded
	for i := 0; i+1 < len(fencers); i++ {
		f.repo.Bouts = append(f.repo.Bouts, pool.PoolBout{
			ID:            uuid.New(),
			PoolID:        seeded.ID,
			Competitor1ID: competitor(fencers[i]),
			Competitor2ID: competitor(fencers[i+1]),
		})
	}
}

func TestCreatePools(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		setup      func(f *createFixture)
		items      func(f *createFixture) []pool.PoolCreateItem
		wantCode   int
		wantDetail string
	}{
		{
			name: "creates pools in an upcoming stage",
			items: func(f *createFixture) []pool.PoolCreateItem {
				return []pool.PoolCreateItem{f.item(1, 1, 2, 3), f.item(2, 4, 5)}
			},
		},
		{
			name: "accepts a competitor already seated in another pool stage",
			setup: func(f *createFixture) {
				f.seedPool(f.otherStage.ID, 1, 1, 2)
			},
			items: func(f *createFixture) []pool.PoolCreateItem { return []pool.PoolCreateItem{f.item(1, 1, 2)} },
		},
		{
			name: "accepts a number used in another pool stage",
			setup: func(f *createFixture) {
				f.seedPool(f.otherStage.ID, 1, 6, 7)
			},
			items: func(f *createFixture) []pool.PoolCreateItem { return []pool.PoolCreateItem{f.item(1, 1, 2)} },
		},
		{
			name: "allows ten fencers when the stage allows more",
			setup: func(f *createFixture) {
				f.updateStage(func(s *poolstage.PoolStage) { s.MaxCompetitorPerPool = 12 })
			},
			items: func(f *createFixture) []pool.PoolCreateItem {
				return []pool.PoolCreateItem{f.item(1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)}
			},
		},
		{
			name: "rejects pools from different pool stages",
			items: func(f *createFixture) []pool.PoolCreateItem {
				other := f.item(2, 3, 4)
				other.PoolStageID = f.otherStage.ID.String()

				return []pool.PoolCreateItem{f.item(1, 1, 2), other}
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "every pool must belong to the same pool stage",
		},
		{
			name: "rejects a competitor listed twice in one pool",
			items: func(f *createFixture) []pool.PoolCreateItem {
				return []pool.PoolCreateItem{f.item(1, 1, 2, 1)}
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "competitor " + competitor(1).String() + " is listed more than once",
		},
		{
			name: "rejects a competitor listed in two pools",
			items: func(f *createFixture) []pool.PoolCreateItem {
				return []pool.PoolCreateItem{f.item(1, 1, 2), f.item(2, 3, 2)}
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "competitor " + competitor(2).String() + " is listed more than once",
		},
		{
			name: "rejects a pool stage that does not exist",
			setup: func(f *createFixture) {
				delete(f.lookup.PoolStages, f.stage.ID)
			},
			items:      func(f *createFixture) []pool.PoolCreateItem { return []pool.PoolCreateItem{f.item(1, 1, 2)} },
			wantCode:   http.StatusBadRequest,
			wantDetail: "pool_stage_id must reference an existing pool stage",
		},
		{
			name: "rejects a pool stage that is not upcoming",
			setup: func(f *createFixture) {
				f.updateStage(func(s *poolstage.PoolStage) { s.Status = poolstage.PoolStageStatusActive })
			},
			items:      func(f *createFixture) []pool.PoolCreateItem { return []pool.PoolCreateItem{f.item(1, 1, 2)} },
			wantCode:   http.StatusConflict,
			wantDetail: "pools can only be created in an upcoming pool stage",
		},
		{
			name: "rejects a pool above the stage's max_competitor_per_pool",
			items: func(f *createFixture) []pool.PoolCreateItem {
				return []pool.PoolCreateItem{f.item(7, 1, 2, 3, 4, 5)}
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "pool 7 must have between 2 and 4 fencers",
		},
		{
			name: "names the first unknown competitor in request order",
			items: func(f *createFixture) []pool.PoolCreateItem {
				return []pool.PoolCreateItem{f.item(1, 1, 20, 21)}
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "competitor " + competitor(20).String() + " does not exist",
		},
		{
			name: "names the first competitor already seated in this pool stage",
			setup: func(f *createFixture) {
				f.seedPool(f.stage.ID, 9, 2, 3)
			},
			items: func(f *createFixture) []pool.PoolCreateItem {
				return []pool.PoolCreateItem{f.item(1, 1, 3, 2)}
			},
			wantCode:   http.StatusConflict,
			wantDetail: "competitor " + competitor(3).String() + " is already in a pool of this pool stage",
		},
		{
			name: "reports a pool stage lookup failure as a server error",
			setup: func(f *createFixture) {
				f.lookup.Err = errors.New("connection refused")
			},
			items:      func(f *createFixture) []pool.PoolCreateItem { return []pool.PoolCreateItem{f.item(1, 1, 2)} },
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
		{
			name: "reports a repository failure as a server error",
			setup: func(f *createFixture) {
				f.repo.Err = errors.New("connection refused")
			},
			items:      func(f *createFixture) []pool.PoolCreateItem { return []pool.PoolCreateItem{f.item(1, 1, 2)} },
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			f := newCreateFixture()
			if tt.setup != nil {
				tt.setup(f)
			}
			items := tt.items(f)
			poolsBefore, boutsBefore := len(f.repo.Pools), len(f.repo.Bouts)

			out, err := pool.NewPoolService(f.repo, f.lookup).
				CreatePools(t.Context(), &pool.PoolCreateInput{Body: f.body(items...)})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				assert.Len(t, f.repo.Pools, poolsBefore)
				assert.Len(t, f.repo.Bouts, boutsBefore)

				return
			}

			require.NoError(t, err)
			assert.Len(t, out.Body.Data, len(items))
			assert.Len(t, f.repo.Pools, poolsBefore+len(items))
		})
	}
}

// poolBoutPairs are the seat pairs of the standard bout order, by pool size.
var poolBoutPairs = map[int][][2]int{
	2: {{1, 2}},
	3: {{1, 2}, {2, 3}, {3, 1}},
	4: {{1, 4}, {2, 3}, {1, 3}, {2, 4}, {3, 4}, {1, 2}},
}

// Seating and the bout order itself are covered by newPoolLineup's tests; this checks the
// service hands each pool to it and stores what comes back.
func TestCreatePoolsStoresPoolsWithTheirBouts(t *testing.T) {
	t.Parallel()

	f := newCreateFixture()
	startTime := time.Date(2026, 10, 24, 9, 30, 0, 0, time.UTC)
	first := f.item(2, 3, 1, 4, 2)
	first.Strip, first.RefereeID, first.StartTime = ptr("Strip A"), ptr(f.referee.String()), &startTime
	body := f.body(first, f.item(1, 7, 5, 6))
	body.PointsToWin, body.TimeLimitSeconds = 15, 540

	out, err := pool.NewPoolService(f.repo, f.lookup).CreatePools(t.Context(), &pool.PoolCreateInput{Body: body})

	require.NoError(t, err)
	require.Len(t, out.Body.Data, 2)
	wantSeating := [][]int{{2, 4, 1, 3}, {6, 7, 5}}
	for i, created := range out.Body.Data {
		item := body.Pools[i]
		assert.Equal(t, item.Number, created.Number, "pools come back in request order")
		assert.Equal(t, item.StartTime, created.StartTime)

		for seat, n := range wantSeating[i] {
			assert.Equal(t, pool.PoolCreatedFencer{CompetitorID: competitor(n).String(), Position: seat + 1}, created.Fencers[seat])
		}

		stored := boutsOf(f.repo, created.ID)
		require.Len(t, stored, len(poolBoutPairs[len(wantSeating[i])]))
		for k, bout := range stored {
			assert.Equal(t, created.Bouts[k].ID, bout.ID.String())
			assert.Equal(t, k+1, bout.GroupSlot)
			assert.Equal(t, f.tournament, bout.TournamentID)
			assert.Equal(t, item.Strip, bout.Location)
			assert.Equal(t, item.Number, bout.GroupNumber)
			assert.Equal(t, "upcoming", bout.Status)
			assert.Equal(t, 15, bout.PointsToWin)
			assert.Equal(t, 540, bout.TimeLimitSeconds)
		}
	}
	assert.Equal(t, &f.referee, boutsOf(f.repo, out.Body.Data[0].ID)[0].RefereeID)
	assert.Nil(t, boutsOf(f.repo, out.Body.Data[1].ID)[0].RefereeID)
}

func boutsOf(repo *FakePoolRepository, poolID string) []pool.PoolBout {
	var found []pool.PoolBout
	for _, bout := range repo.Bouts {
		if bout.PoolID.String() == poolID {
			found = append(found, bout)
		}
	}

	return found
}

func TestListPools(t *testing.T) {
	t.Parallel()

	stageID := uuid.New()
	mixed := []pool.Pool{
		seededPool(stageID),
		seededPool(stageID),
		seededPool(uuid.New()),
	}

	tests := []struct {
		name      string
		input     *pool.PoolListInput
		wantTotal int64
		wantLimit int
		wantCode  int
	}{
		{
			name:      "filters by pool_stage_id",
			input:     &pool.PoolListInput{PoolStageID: stageID.String()},
			wantTotal: 2,
			wantLimit: pool.PoolDefaultPageSize,
		},
		{
			name:      "clamps a limit above the maximum",
			input:     &pool.PoolListInput{Limit: 500},
			wantTotal: 3,
			wantLimit: pool.PoolMaxPageSize,
		},
		{
			name:     "rejects a bad pool_stage_id",
			input:    &pool.PoolListInput{PoolStageID: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := pool.NewPoolService(NewFakePoolRepository(mixed...), NewFakePoolStageLookup()).
				ListPools(t.Context(), tt.input)

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

func TestUpdatePoolByID(t *testing.T) {
	t.Parallel()

	referee := uuid.New()
	startTime := time.Date(2026, 10, 24, 9, 30, 0, 0, time.UTC)
	stored := seededPool(uuid.New())
	stored.Number = 1
	sibling := seededPool(stored.PoolStageID)
	sibling.Number = 2

	tests := []struct {
		name       string
		id         string
		body       pool.PoolUpdateBody
		wantCode   int
		wantDetail string
	}{
		{
			name: "assigns a referee",
			id:   stored.ID.String(),
			body: pool.PoolUpdateBody{RefereeID: ptr(referee.String())},
		},
		{
			name: "updates number, strip and start_time",
			id:   stored.ID.String(),
			body: pool.PoolUpdateBody{Number: ptr(3), Strip: ptr("Strip 4"), StartTime: &startTime},
		},
		{
			name:       "rejects a number already used in the pool stage",
			id:         stored.ID.String(),
			body:       pool.PoolUpdateBody{Number: ptr(2)},
			wantCode:   http.StatusConflict,
			wantDetail: "a pool with this number already exists in the pool stage",
		},
		{
			name:       "refuses an empty patch",
			id:         stored.ID.String(),
			body:       pool.PoolUpdateBody{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects a bad referee_id",
			id:         stored.ID.String(),
			body:       pool.PoolUpdateBody{RefereeID: ptr("not-a-uuid")},
			wantCode:   http.StatusBadRequest,
			wantDetail: "referee_id must be a valid uuid",
		},
		{
			name:       "rejects a bad id",
			id:         "not-a-uuid",
			body:       pool.PoolUpdateBody{RefereeID: ptr(referee.String())},
			wantCode:   http.StatusBadRequest,
			wantDetail: "id must be a valid uuid",
		},
		{
			name:     "reports an unknown id as not found",
			id:       uuid.New().String(),
			body:     pool.PoolUpdateBody{RefereeID: ptr(referee.String())},
			wantCode: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakePoolRepository(stored, sibling)
			out, err := pool.NewPoolService(repo, NewFakePoolStageLookup()).
				UpdatePoolByID(t.Context(), &pool.PoolUpdateInput{ID: tt.id, Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, stored, repo.Pools[stored.ID])

				return
			}

			require.NoError(t, err)
			after := repo.Pools[stored.ID]
			assert.Equal(t, after.Number, out.Body.Number)
			assert.Equal(t, after.Strip, out.Body.Strip)
			assert.Equal(t, after.StartTime, out.Body.StartTime)
			if tt.body.RefereeID != nil {
				assert.Equal(t, tt.body.RefereeID, out.Body.RefereeID)
				assert.Equal(t, &referee, after.RefereeID)
			}
			if tt.body.Number != nil {
				assert.Equal(t, *tt.body.Number, out.Body.Number)
			}
			if tt.body.Strip != nil {
				assert.Equal(t, tt.body.Strip, out.Body.Strip)
			}
			if tt.body.StartTime != nil {
				assert.Equal(t, tt.body.StartTime, out.Body.StartTime)
			}
		})
	}
}

func TestDeletePoolByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		hasBouts   bool
		unknownID  bool
		badID      bool
		wantCode   int
		wantDetail string
	}{
		{name: "deletes a pool"},
		{
			name:       "refuses to delete a pool that has bouts",
			hasBouts:   true,
			wantCode:   http.StatusConflict,
			wantDetail: "a pool with bouts cannot be deleted",
		},
		{
			name:      "reports an unknown id as not found",
			unknownID: true,
			wantCode:  http.StatusNotFound,
		},
		{
			name:       "rejects a bad id",
			badID:      true,
			wantCode:   http.StatusBadRequest,
			wantDetail: "id must be a valid uuid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededPool(uuid.New())
			repo := NewFakePoolRepository(stored)
			repo.WithBouts[stored.ID] = tt.hasBouts

			id := stored.ID.String()
			switch {
			case tt.unknownID:
				id = uuid.New().String()
			case tt.badID:
				id = "not-a-uuid"
			}

			_, err := pool.NewPoolService(repo, NewFakePoolStageLookup()).
				DeletePoolByID(t.Context(), &pool.PoolIDInput{ID: id})

			if tt.wantCode == 0 {
				require.NoError(t, err)
				assert.NotContains(t, repo.Pools, stored.ID)

				return
			}

			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantCode, code)
			if tt.wantDetail != "" {
				assert.Equal(t, tt.wantDetail, detail)
			}
			assert.Contains(t, repo.Pools, stored.ID)
		})
	}
}

func TestPoolRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakePoolRepository()
	repo.Err = errors.New("connection refused")

	_, err := pool.NewPoolService(repo, NewFakePoolStageLookup()).
		ListPools(t.Context(), &pool.PoolListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}

func TestStartPool(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		arrange    func(p *pool.Pool, stage *poolstage.PoolStage)
		stageErr   error
		repoErr    error
		id         string
		wantCode   int
		wantDetail string
	}{
		{name: "starts a pool with a referee in an active stage"},
		{
			name:       "rejects a bad id",
			id:         "not-a-uuid",
			wantCode:   http.StatusBadRequest,
			wantDetail: "id must be a valid uuid",
		},
		{
			name:     "reports an unknown id as not found",
			id:       uuid.New().String(),
			wantCode: http.StatusNotFound,
		},
		{
			name: "refuses a pool that already started",
			arrange: func(p *pool.Pool, _ *poolstage.PoolStage) {
				p.StartedAt = ptr(time.Now().Add(-time.Hour))
			},
			wantCode:   http.StatusConflict,
			wantDetail: "this pool has already started",
		},
		{
			name:       "refuses a pool without a referee",
			arrange:    func(p *pool.Pool, _ *poolstage.PoolStage) { p.RefereeID = nil },
			wantCode:   http.StatusConflict,
			wantDetail: "a referee must be assigned before the pool can start",
		},
		{
			name:       "refuses an upcoming pool stage",
			arrange:    func(_ *pool.Pool, s *poolstage.PoolStage) { s.Status = poolstage.PoolStageStatusUpcoming },
			wantCode:   http.StatusConflict,
			wantDetail: "pools can only be started in an active pool stage",
		},
		{
			name:       "refuses an ended pool stage",
			arrange:    func(_ *pool.Pool, s *poolstage.PoolStage) { s.Status = poolstage.PoolStageStatusEnded },
			wantCode:   http.StatusConflict,
			wantDetail: "pools can only be started in an active pool stage",
		},
		{
			name:       "reports a pool stage lookup failure as a server error",
			stageErr:   errors.New("connection refused"),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
		{
			name:       "reports a repository failure as a server error",
			repoErr:    errors.New("connection refused"),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stage := seededPoolStage()
			stage.Status = poolstage.PoolStageStatusActive
			stored := seededPool(stage.ID)
			stored.RefereeID = ptr(uuid.New())
			if tt.arrange != nil {
				tt.arrange(&stored, &stage)
			}

			repo := NewFakePoolRepository(stored)
			repo.Err = tt.repoErr
			lookup := NewFakePoolStageLookup(stage)
			lookup.Err = tt.stageErr

			id := stored.ID.String()
			if tt.id != "" {
				id = tt.id
			}

			out, err := pool.NewPoolService(repo, lookup).StartPool(t.Context(), &pool.PoolIDInput{ID: id})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, stored.StartedAt, repo.Pools[stored.ID].StartedAt)

				return
			}

			require.NoError(t, err)
			require.NotNil(t, out.Body.StartedAt)
			assert.Nil(t, out.Body.CompletedAt)
			assert.Equal(t, repo.Pools[stored.ID].StartedAt, out.Body.StartedAt)
		})
	}
}

func TestEndPool(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		arrange    func(p *pool.Pool)
		openBouts  int64
		repoErr    error
		id         string
		wantCode   int
		wantDetail string
	}{
		{name: "ends a started pool whose bouts have all ended"},
		{
			name:       "rejects a bad id",
			id:         "not-a-uuid",
			wantCode:   http.StatusBadRequest,
			wantDetail: "id must be a valid uuid",
		},
		{
			name:     "reports an unknown id as not found",
			id:       uuid.New().String(),
			wantCode: http.StatusNotFound,
		},
		{
			name:       "refuses a pool that never started",
			arrange:    func(p *pool.Pool) { p.StartedAt = nil },
			wantCode:   http.StatusConflict,
			wantDetail: "a pool must start before it can end",
		},
		{
			name: "refuses a pool that already ended",
			arrange: func(p *pool.Pool) {
				p.CompletedAt = ptr(time.Now().Add(-time.Minute))
			},
			wantCode:   http.StatusConflict,
			wantDetail: "this pool has already ended",
		},
		{
			name:       "refuses a pool with bouts still open",
			openBouts:  2,
			wantCode:   http.StatusConflict,
			wantDetail: "every bout in the pool must end before the pool can end",
		},
		{
			name:       "reports a repository failure as a server error",
			repoErr:    errors.New("connection refused"),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededPool(uuid.New())
			stored.StartedAt = ptr(time.Now().Add(-time.Hour))
			if tt.arrange != nil {
				tt.arrange(&stored)
			}

			repo := NewFakePoolRepository(stored)
			repo.OpenBouts[stored.ID] = tt.openBouts
			repo.Err = tt.repoErr

			id := stored.ID.String()
			if tt.id != "" {
				id = tt.id
			}

			out, err := pool.NewPoolService(repo, NewFakePoolStageLookup()).
				EndPool(t.Context(), &pool.PoolIDInput{ID: id})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, stored.CompletedAt, repo.Pools[stored.ID].CompletedAt)

				return
			}

			require.NoError(t, err)
			require.NotNil(t, out.Body.CompletedAt)
			assert.Equal(t, stored.StartedAt, out.Body.StartedAt)
			assert.Equal(t, repo.Pools[stored.ID].CompletedAt, out.Body.CompletedAt)
		})
	}
}
