package test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/event"
	"boutline/internal/features/poolstage"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seededEvent() event.Event {
	return event.Event{
		ID:           uuid.New(),
		TournamentID: uuid.New(),
		Format:       event.EventFormatPoolThenDirectElimination,
		Name:         "lightweight",
		Status:       event.EventStatusUpcoming,
	}
}

func seededPoolStage(status poolstage.PoolStageStatus, eventID uuid.UUID) poolstage.PoolStage {
	return poolstage.PoolStage{
		ID:                   uuid.New(),
		EventID:              eventID,
		MaxCompetitorPerPool: 6,
		Status:               status,
	}
}

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func ptr[T any](v T) *T { return &v }

func TestCreatePoolStage(t *testing.T) {
	t.Parallel()

	parent := seededEvent()

	tests := []struct {
		name        string
		lookup      *FakeEventLookup
		input       *poolstage.PoolStageCreateInput
		wantCode    int
		wantDetail  string
		wantMax     int
		wantNoStage bool
	}{
		{
			name:   "creates an upcoming pool stage",
			lookup: NewFakeEventLookup(parent),
			input: &poolstage.PoolStageCreateInput{Body: poolstage.PoolStageCreateBody{
				EventID:              parent.ID.String(),
				MaxCompetitorPerPool: 6,
			}},
			wantMax: 6,
		},
		{
			name:   "accepts the smallest allowed pool size",
			lookup: NewFakeEventLookup(parent),
			input: &poolstage.PoolStageCreateInput{Body: poolstage.PoolStageCreateBody{
				EventID:              parent.ID.String(),
				MaxCompetitorPerPool: 2,
			}},
			wantMax: 2,
		},
		{
			name:   "rejects an event_id that does not exist",
			lookup: NewFakeEventLookup(),
			input: &poolstage.PoolStageCreateInput{Body: poolstage.PoolStageCreateBody{
				EventID:              uuid.New().String(),
				MaxCompetitorPerPool: 6,
			}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "event_id must reference an existing event",
			wantNoStage: true,
		},
		{
			name:   "rejects a pool size below two",
			lookup: NewFakeEventLookup(parent),
			input: &poolstage.PoolStageCreateInput{Body: poolstage.PoolStageCreateBody{
				EventID:              parent.ID.String(),
				MaxCompetitorPerPool: 1,
			}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "max_competitor_per_pool must be at least 2",
			wantNoStage: true,
		},
		{
			name:   "rejects a bad uuid",
			lookup: NewFakeEventLookup(parent),
			input: &poolstage.PoolStageCreateInput{Body: poolstage.PoolStageCreateBody{
				EventID:              "not-a-uuid",
				MaxCompetitorPerPool: 6,
			}},
			wantCode:    http.StatusBadRequest,
			wantDetail:  "event_id must be a valid uuid",
			wantNoStage: true,
		},
		{
			name:   "reports an event lookup failure as a server error",
			lookup: &FakeEventLookup{Err: errors.New("connection refused")},
			input: &poolstage.PoolStageCreateInput{Body: poolstage.PoolStageCreateBody{
				EventID:              parent.ID.String(),
				MaxCompetitorPerPool: 6,
			}},
			wantCode:    http.StatusInternalServerError,
			wantDetail:  "internal server error",
			wantNoStage: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakePoolStageRepository()
			out, err := poolstage.NewPoolStageService(repo, tt.lookup).CreatePoolStage(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				if tt.wantNoStage {
					assert.Empty(t, repo.PoolStages)
				}

				return
			}

			require.NoError(t, err)
			assert.Equal(t, poolstage.PoolStageStatusUpcoming, out.Body.Status)
			assert.Equal(t, parent.ID.String(), out.Body.EventID)
			assert.Equal(t, tt.wantMax, out.Body.MaxCompetitorPerPool)
			assert.Len(t, repo.PoolStages, 1)
		})
	}
}

func TestListPoolStages(t *testing.T) {
	t.Parallel()

	eventID := uuid.New()
	otherEventID := uuid.New()

	mixed := []poolstage.PoolStage{
		seededPoolStage(poolstage.PoolStageStatusUpcoming, eventID),
		seededPoolStage(poolstage.PoolStageStatusActive, eventID),
		seededPoolStage(poolstage.PoolStageStatusUpcoming, otherEventID),
	}

	tests := []struct {
		name      string
		input     *poolstage.PoolStageListInput
		wantTotal int64
		wantLimit int
		wantCode  int
	}{
		{
			name:      "filters by event_id",
			input:     &poolstage.PoolStageListInput{EventID: eventID.String()},
			wantTotal: 2,
			wantLimit: poolstage.PoolStageDefaultPageSize,
		},
		{
			name:      "filters by status",
			input:     &poolstage.PoolStageListInput{Status: poolstage.PoolStageStatusActive},
			wantTotal: 1,
			wantLimit: poolstage.PoolStageDefaultPageSize,
		},
		{
			name:      "clamps a limit above the maximum",
			input:     &poolstage.PoolStageListInput{Limit: 500},
			wantTotal: 3,
			wantLimit: poolstage.PoolStageMaxPageSize,
		},
		{
			name:     "rejects an unknown status",
			input:    &poolstage.PoolStageListInput{Status: poolstage.PoolStageStatus("nope")},
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "rejects a bad event_id",
			input:    &poolstage.PoolStageListInput{EventID: "not-a-uuid"},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := poolstage.NewPoolStageService(NewFakePoolStageRepository(mixed...), NewFakeEventLookup()).
				ListPoolStages(t.Context(), tt.input)

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

func TestGetPoolStageByID(t *testing.T) {
	t.Parallel()

	stored := seededPoolStage(poolstage.PoolStageStatusUpcoming, uuid.New())

	tests := []struct {
		name     string
		id       string
		wantCode int
	}{
		{name: "returns the stored pool stage", id: stored.ID.String()},
		{name: "reports an unknown id as not found", id: uuid.New().String(), wantCode: http.StatusNotFound},
		{name: "rejects a bad uuid", id: "not-a-uuid", wantCode: http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := poolstage.NewPoolStageService(NewFakePoolStageRepository(stored), NewFakeEventLookup()).
				GetPoolStageByID(t.Context(), &poolstage.PoolStageIDInput{ID: tt.id})

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, stored.ID.String(), out.Body.ID)
			assert.Equal(t, stored.MaxCompetitorPerPool, out.Body.MaxCompetitorPerPool)
		})
	}
}

func TestUpdatePoolStageByID(t *testing.T) {
	t.Parallel()

	newStart := time.Date(2026, 11, 1, 9, 0, 0, 0, time.UTC)

	tests := []struct {
		name       string
		status     poolstage.PoolStageStatus
		unknownID  bool
		body       poolstage.PoolStageUpdateBody
		wantCode   int
		wantDetail string
		wantMax    int
	}{
		{
			name:    "edits an upcoming pool stage",
			status:  poolstage.PoolStageStatusUpcoming,
			body:    poolstage.PoolStageUpdateBody{MaxCompetitorPerPool: ptr(4)},
			wantMax: 4,
		},
		{
			name:    "updates only the scheduled start time",
			status:  poolstage.PoolStageStatusUpcoming,
			body:    poolstage.PoolStageUpdateBody{StartTime: &newStart},
			wantMax: 6,
		},
		{
			name:       "refuses to edit an active pool stage",
			status:     poolstage.PoolStageStatusActive,
			body:       poolstage.PoolStageUpdateBody{MaxCompetitorPerPool: ptr(4)},
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming pool stage can be edited",
		},
		{
			name:       "refuses to edit an ended pool stage",
			status:     poolstage.PoolStageStatusEnded,
			body:       poolstage.PoolStageUpdateBody{MaxCompetitorPerPool: ptr(4)},
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming pool stage can be edited",
		},
		{
			name:       "refuses an empty patch",
			status:     poolstage.PoolStageStatusUpcoming,
			body:       poolstage.PoolStageUpdateBody{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects a pool size below two",
			status:     poolstage.PoolStageStatusUpcoming,
			body:       poolstage.PoolStageUpdateBody{MaxCompetitorPerPool: ptr(1)},
			wantCode:   http.StatusBadRequest,
			wantDetail: "max_competitor_per_pool must be at least 2",
		},
		{
			name:      "reports an unknown id as not found",
			status:    poolstage.PoolStageStatusUpcoming,
			unknownID: true,
			body:      poolstage.PoolStageUpdateBody{MaxCompetitorPerPool: ptr(4)},
			wantCode:  http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededPoolStage(tt.status, uuid.New())
			repo := NewFakePoolStageRepository(stored)
			id := stored.ID
			if tt.unknownID {
				id = uuid.New()
			}

			out, err := poolstage.NewPoolStageService(repo, NewFakeEventLookup()).UpdatePoolStageByID(
				t.Context(), &poolstage.PoolStageUpdateInput{ID: id.String(), Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Equal(t, stored.MaxCompetitorPerPool, repo.PoolStages[stored.ID].MaxCompetitorPerPool)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantMax, out.Body.MaxCompetitorPerPool)
			assert.Equal(t, tt.wantMax, repo.PoolStages[stored.ID].MaxCompetitorPerPool)
			if tt.body.StartTime != nil {
				require.NotNil(t, out.Body.StartTime)
				assert.Equal(t, newStart, *out.Body.StartTime)
			}
		})
	}
}

func TestStartPoolStage(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		status     poolstage.PoolStageStatus
		pools      PoolCount
		id         string
		repoErr    error
		wantCode   int
		wantDetail string
	}{
		{
			name:   "moves an upcoming pool stage with pools to active",
			status: poolstage.PoolStageStatusUpcoming,
			pools:  PoolCount{Total: 2, Open: 2},
		},
		{
			name:       "refuses an active pool stage",
			status:     poolstage.PoolStageStatusActive,
			pools:      PoolCount{Total: 2, Open: 2},
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming pool stage can be started",
		},
		{
			name:       "refuses an ended pool stage",
			status:     poolstage.PoolStageStatusEnded,
			pools:      PoolCount{Total: 2},
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming pool stage can be started",
		},
		{
			name:       "refuses a pool stage with no pools",
			status:     poolstage.PoolStageStatusUpcoming,
			wantCode:   http.StatusConflict,
			wantDetail: "a pool stage needs at least one pool before it can start",
		},
		{
			name:     "reports an unknown id as not found",
			status:   poolstage.PoolStageStatusUpcoming,
			id:       uuid.New().String(),
			wantCode: http.StatusNotFound,
		},
		{
			name:     "rejects a bad uuid",
			status:   poolstage.PoolStageStatusUpcoming,
			id:       "not-a-uuid",
			wantCode: http.StatusBadRequest,
		},
		{
			name:       "reports a repository failure as a server error",
			status:     poolstage.PoolStageStatusUpcoming,
			pools:      PoolCount{Total: 2, Open: 2},
			repoErr:    errors.New("connection refused"),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededPoolStage(tt.status, uuid.New())
			repo := NewFakePoolStageRepository(stored)
			repo.PoolCounts[stored.ID] = tt.pools
			repo.Err = tt.repoErr
			id := tt.id
			if id == "" {
				id = stored.ID.String()
			}

			out, err := poolstage.NewPoolStageService(repo, NewFakeEventLookup()).
				StartPoolStage(t.Context(), &poolstage.PoolStageIDInput{ID: id})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, tt.status, repo.PoolStages[stored.ID].Status)
				assert.Nil(t, repo.PoolStages[stored.ID].StartedAt)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, poolstage.PoolStageStatusActive, out.Body.Status)
			require.NotNil(t, out.Body.StartedAt)
			assert.WithinDuration(t, time.Now().UTC(), *out.Body.StartedAt, time.Minute)
			assert.Nil(t, out.Body.CompletedAt)
			assert.Equal(t, poolstage.PoolStageStatusActive, repo.PoolStages[stored.ID].Status)
			assert.NotNil(t, repo.PoolStages[stored.ID].StartedAt)
		})
	}
}

func TestEndPoolStage(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		status     poolstage.PoolStageStatus
		pools      PoolCount
		id         string
		repoErr    error
		wantCode   int
		wantDetail string
	}{
		{
			name:   "moves an active pool stage whose pools have all ended to ended",
			status: poolstage.PoolStageStatusActive,
			pools:  PoolCount{Total: 2},
		},
		{
			name:       "refuses an upcoming pool stage",
			status:     poolstage.PoolStageStatusUpcoming,
			pools:      PoolCount{Total: 2},
			wantCode:   http.StatusConflict,
			wantDetail: "only an active pool stage can be ended",
		},
		{
			name:       "refuses an ended pool stage",
			status:     poolstage.PoolStageStatusEnded,
			pools:      PoolCount{Total: 2},
			wantCode:   http.StatusConflict,
			wantDetail: "only an active pool stage can be ended",
		},
		{
			name:       "refuses while a pool is still open",
			status:     poolstage.PoolStageStatusActive,
			pools:      PoolCount{Total: 2, Open: 1},
			wantCode:   http.StatusConflict,
			wantDetail: "every pool must end before the pool stage can end",
		},
		{
			name:     "reports an unknown id as not found",
			status:   poolstage.PoolStageStatusActive,
			id:       uuid.New().String(),
			wantCode: http.StatusNotFound,
		},
		{
			name:     "rejects a bad uuid",
			status:   poolstage.PoolStageStatusActive,
			id:       "not-a-uuid",
			wantCode: http.StatusBadRequest,
		},
		{
			name:       "reports a repository failure as a server error",
			status:     poolstage.PoolStageStatusActive,
			pools:      PoolCount{Total: 2},
			repoErr:    errors.New("connection refused"),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededPoolStage(tt.status, uuid.New())
			repo := NewFakePoolStageRepository(stored)
			repo.PoolCounts[stored.ID] = tt.pools
			repo.Err = tt.repoErr
			id := tt.id
			if id == "" {
				id = stored.ID.String()
			}

			out, err := poolstage.NewPoolStageService(repo, NewFakeEventLookup()).
				EndPoolStage(t.Context(), &poolstage.PoolStageIDInput{ID: id})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, tt.status, repo.PoolStages[stored.ID].Status)
				assert.Nil(t, repo.PoolStages[stored.ID].CompletedAt)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, poolstage.PoolStageStatusEnded, out.Body.Status)
			require.NotNil(t, out.Body.CompletedAt)
			assert.WithinDuration(t, time.Now().UTC(), *out.Body.CompletedAt, time.Minute)
			assert.Equal(t, poolstage.PoolStageStatusEnded, repo.PoolStages[stored.ID].Status)
			assert.NotNil(t, repo.PoolStages[stored.ID].CompletedAt)
		})
	}
}

func TestDeletePoolStageByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		status     poolstage.PoolStageStatus
		unknownID  bool
		withBouts  bool
		wantCode   int
		wantDetail string
	}{
		{name: "deletes an upcoming pool stage", status: poolstage.PoolStageStatusUpcoming},
		{
			name:       "refuses to delete an active pool stage",
			status:     poolstage.PoolStageStatusActive,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming pool stage can be deleted",
		},
		{
			name:       "refuses to delete an ended pool stage",
			status:     poolstage.PoolStageStatusEnded,
			wantCode:   http.StatusConflict,
			wantDetail: "only an upcoming pool stage can be deleted",
		},
		{
			name:       "keeps the bouts message when pools still have bouts",
			status:     poolstage.PoolStageStatusUpcoming,
			withBouts:  true,
			wantCode:   http.StatusConflict,
			wantDetail: "a pool stage whose pools have bouts cannot be deleted",
		},
		{
			name:      "reports an unknown id as not found",
			status:    poolstage.PoolStageStatusUpcoming,
			unknownID: true,
			wantCode:  http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seededPoolStage(tt.status, uuid.New())
			repo := NewFakePoolStageRepository(stored)
			repo.WithBouts[stored.ID] = tt.withBouts
			id := stored.ID
			if tt.unknownID {
				id = uuid.New()
			}

			_, err := poolstage.NewPoolStageService(repo, NewFakeEventLookup()).
				DeletePoolStageByID(t.Context(), &poolstage.PoolStageIDInput{ID: id.String()})

			if tt.wantCode == 0 {
				require.NoError(t, err)
				assert.NotContains(t, repo.PoolStages, stored.ID)
				return
			}

			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantCode, code)
			if tt.wantDetail != "" {
				assert.Equal(t, tt.wantDetail, detail)
			}
			assert.Contains(t, repo.PoolStages, stored.ID)
		})
	}
}

func TestPoolStageRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakePoolStageRepository()
	repo.Err = errors.New("connection refused")

	_, err := poolstage.NewPoolStageService(repo, NewFakeEventLookup()).
		ListPoolStages(t.Context(), &poolstage.PoolStageListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
