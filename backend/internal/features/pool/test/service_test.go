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

func TestCreatePool(t *testing.T) {
	t.Parallel()

	stage := seededPoolStage()
	referee := uuid.New()

	tests := []struct {
		name        string
		lookup      *FakePoolStageLookup
		body        pool.PoolCreateBody
		wantCode    int
		wantDetail  string
		wantReferee *string
	}{
		{
			name:   "creates a pool without a referee",
			lookup: NewFakePoolStageLookup(stage),
			body:   pool.PoolCreateBody{PoolStageID: stage.ID.String()},
		},
		{
			name:        "creates a pool with a referee",
			lookup:      NewFakePoolStageLookup(stage),
			body:        pool.PoolCreateBody{PoolStageID: stage.ID.String(), RefereeID: ptr(referee.String())},
			wantReferee: ptr(referee.String()),
		},
		{
			name:       "rejects a pool_stage_id that does not exist",
			lookup:     NewFakePoolStageLookup(),
			body:       pool.PoolCreateBody{PoolStageID: uuid.New().String()},
			wantCode:   http.StatusBadRequest,
			wantDetail: "pool_stage_id must reference an existing pool stage",
		},
		{
			name:       "rejects a bad pool_stage_id",
			lookup:     NewFakePoolStageLookup(stage),
			body:       pool.PoolCreateBody{PoolStageID: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "pool_stage_id must be a valid uuid",
		},
		{
			name:       "rejects a bad referee_id",
			lookup:     NewFakePoolStageLookup(stage),
			body:       pool.PoolCreateBody{PoolStageID: stage.ID.String(), RefereeID: ptr("not-a-uuid")},
			wantCode:   http.StatusBadRequest,
			wantDetail: "referee_id must be a valid uuid",
		},
		{
			name:       "reports a pool stage lookup failure as a server error",
			lookup:     &FakePoolStageLookup{Err: errors.New("connection refused")},
			body:       pool.PoolCreateBody{PoolStageID: stage.ID.String()},
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakePoolRepository()
			out, err := pool.NewPoolService(repo, tt.lookup).
				CreatePool(t.Context(), &pool.PoolCreateInput{Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				assert.Empty(t, repo.Pools)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, stage.ID.String(), out.Body.PoolStageID)
			assert.Equal(t, tt.wantReferee, out.Body.RefereeID)
			assert.Len(t, repo.Pools, 1)
		})
	}
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
	stored := seededPool(uuid.New())

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

			repo := NewFakePoolRepository(stored)
			out, err := pool.NewPoolService(repo, NewFakePoolStageLookup()).
				UpdatePoolByID(t.Context(), &pool.PoolUpdateInput{ID: tt.id, Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Nil(t, repo.Pools[stored.ID].RefereeID)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, ptr(referee.String()), out.Body.RefereeID)
			assert.Equal(t, &referee, repo.Pools[stored.ID].RefereeID)
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
