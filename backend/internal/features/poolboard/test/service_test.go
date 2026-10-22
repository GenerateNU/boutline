package test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/poolboard"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	boardEventID = uuid.MustParse("c0000000-0000-4000-8000-000000000001")
	boardStageID = uuid.MustParse("f0000000-0000-4000-8000-000000000001")
	boardPool1ID = uuid.MustParse("f1000000-0000-4000-8000-000000000001")
	boardPool2ID = uuid.MustParse("f1000000-0000-4000-8000-000000000002")
	boardPool3ID = uuid.MustParse("f1000000-0000-4000-8000-000000000003")
)

func competitorID(n int) uuid.UUID {
	return uuid.MustParse(fmt.Sprintf("d0000000-0000-4000-8000-%012d", n))
}

func boutID(n int) uuid.UUID {
	return uuid.MustParse(fmt.Sprintf("e0000000-0000-4000-8000-%012d", n))
}

func ptr[T any](v T) *T { return &v }

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

// fencersOf seats the named fencers in position order, numbering competitors from first.
func fencersOf(poolID uuid.UUID, first int, names ...string) []poolboard.PoolBoardFencerRow {
	rows := make([]poolboard.PoolBoardFencerRow, 0, len(names))
	for i, name := range names {
		rows = append(rows, poolboard.PoolBoardFencerRow{
			PoolID:       poolID,
			CompetitorID: competitorID(first + i),
			Position:     i + 1,
			FirstName:    name,
			LastName:     "Fencer",
			Team:         "Boston Fencing Club",
		})
	}

	return rows
}

func boutOf(n int, poolID uuid.UUID, status string, c1, score1, c2, score2 int) poolboard.PoolBoardBoutRow {
	return poolboard.PoolBoardBoutRow{
		ID:               boutID(n),
		PoolID:           poolID,
		Status:           status,
		Competitor1ID:    competitorID(c1),
		Competitor2ID:    competitorID(c2),
		Competitor1Score: score1,
		Competitor2Score: score2,
		Location:         ptr("Strip 1"),
	}
}

// seededBoardRepository holds one event with an active pool 1 and an ended pool 2 (both fenced
// round-robin so far) and an upcoming pool 3 that has no fencers or bouts yet.
func seededBoardRepository() *FakePoolBoardRepository {
	started := time.Date(2026, 10, 1, 9, 0, 0, 0, time.UTC)
	completed := started.Add(2 * time.Hour)

	fencers := fencersOf(boardPool1ID, 1, "Maya", "Liam", "Priya", "Diego")
	fencers = append(fencers, fencersOf(boardPool2ID, 5, "Hana", "Noah", "Amara", "Ethan")...)

	return &FakePoolBoardRepository{
		Events: map[uuid.UUID][]poolboard.PoolBoardPoolRow{
			boardEventID: {
				{ID: boardPool1ID, PoolStageID: boardStageID, Number: 1, Strip: ptr("Strip 1"), StartedAt: &started},
				{ID: boardPool2ID, PoolStageID: boardStageID, Number: 2, StartedAt: &started, CompletedAt: &completed},
				{ID: boardPool3ID, PoolStageID: boardStageID, Number: 3, StartTime: &completed},
			},
		},
		Fencers: fencers,
		Bouts: []poolboard.PoolBoardBoutRow{
			boutOf(1, boardPool1ID, "ended", 1, 5, 2, 2),
			boutOf(2, boardPool1ID, "ended", 3, 5, 4, 3),
			boutOf(3, boardPool1ID, "ended", 1, 5, 3, 4),
			boutOf(4, boardPool1ID, "ended", 2, 2, 4, 5),
			boutOf(5, boardPool1ID, "active", 1, 2, 4, 2),
			boutOf(6, boardPool1ID, "upcoming", 2, 0, 3, 0),
			boutOf(7, boardPool2ID, "ended", 5, 5, 6, 1),
			boutOf(8, boardPool2ID, "ended", 7, 4, 8, 5),
		},
	}
}

func TestListPoolBoards(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		repo       *FakePoolBoardRepository
		input      *poolboard.PoolBoardListInput
		wantTotal  int64
		wantLen    int
		wantLimit  int
		wantOffset int
		wantCode   int
		wantDetail string
	}{
		{
			name:      "returns every pool of the event",
			repo:      seededBoardRepository(),
			input:     &poolboard.PoolBoardListInput{EventID: boardEventID.String()},
			wantTotal: 3,
			wantLen:   3,
			wantLimit: poolboard.PoolBoardDefaultPageSize,
		},
		{
			name:       "pages with limit and offset while total ignores the page",
			repo:       seededBoardRepository(),
			input:      &poolboard.PoolBoardListInput{EventID: boardEventID.String(), Limit: 1, Offset: 1},
			wantTotal:  3,
			wantLen:    1,
			wantLimit:  1,
			wantOffset: 1,
		},
		{
			name:      "clamps a limit above the maximum",
			repo:      seededBoardRepository(),
			input:     &poolboard.PoolBoardListInput{EventID: boardEventID.String(), Limit: 500},
			wantTotal: 3,
			wantLen:   3,
			wantLimit: poolboard.PoolBoardMaxPageSize,
		},
		{
			name:      "an unknown event has no pools",
			repo:      seededBoardRepository(),
			input:     &poolboard.PoolBoardListInput{EventID: uuid.New().String()},
			wantLimit: poolboard.PoolBoardDefaultPageSize,
		},
		{
			name:       "rejects a bad event_id",
			repo:       seededBoardRepository(),
			input:      &poolboard.PoolBoardListInput{EventID: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "event_id must be a valid uuid",
		},
		{
			name:       "reports a repository failure as a server error",
			repo:       &FakePoolBoardRepository{Err: errors.New("connection refused")},
			input:      &poolboard.PoolBoardListInput{EventID: boardEventID.String()},
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := poolboard.NewPoolBoardService(tt.repo).ListPoolBoards(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)
			assert.NotNil(t, out.Body.Data)
			assert.Len(t, out.Body.Data, tt.wantLen)
		})
	}
}

func TestListPoolBoardsContent(t *testing.T) {
	t.Parallel()

	out, err := poolboard.NewPoolBoardService(seededBoardRepository()).
		ListPoolBoards(t.Context(), &poolboard.PoolBoardListInput{EventID: boardEventID.String()})
	require.NoError(t, err)
	require.Len(t, out.Body.Data, 3)

	pool1, pool2, pool3 := out.Body.Data[0], out.Body.Data[1], out.Body.Data[2]

	t.Run("pools keep board order and derive status", func(t *testing.T) {
		t.Parallel()

		assert.Equal(t, []int{1, 2, 3}, []int{pool1.Number, pool2.Number, pool3.Number})
		assert.Equal(t,
			[]poolboard.PoolBoardStatus{poolboard.PoolBoardStatusActive, poolboard.PoolBoardStatusEnded, poolboard.PoolBoardStatusUpcoming},
			[]poolboard.PoolBoardStatus{pool1.Status, pool2.Status, pool3.Status})
	})

	t.Run("fencers are in position order with their standing", func(t *testing.T) {
		t.Parallel()

		require.Len(t, pool1.Fencers, 4)
		maya := pool1.Fencers[0]
		assert.Equal(t, competitorID(1).String(), maya.CompetitorID)
		assert.Equal(t, "Maya", maya.FirstName)
		assert.Equal(t, poolboard.PoolBoardStanding{
			Place: 1, Victories: 2, Matches: 2, VictoryRatio: 1,
			TouchesScored: 10, TouchesReceived: 6, Indicator: 4,
		}, maya.Standing)

		places := make([]int, 0, len(pool1.Fencers))
		for _, fencer := range pool1.Fencers {
			places = append(places, fencer.Standing.Place)
		}
		assert.Equal(t, []int{1, 4, 2, 3}, places)
	})

	t.Run("only ended bouts have a winner", func(t *testing.T) {
		t.Parallel()

		require.Len(t, pool1.Bouts, 6)
		ended, active := pool1.Bouts[0], pool1.Bouts[4]
		require.NotNil(t, ended.WinnerID)
		assert.Equal(t, competitorID(1).String(), *ended.WinnerID)
		assert.Nil(t, active.WinnerID)
		assert.Equal(t, 2, active.Competitor1Score)
		assert.Equal(t, 2, active.Competitor2Score)
	})

	t.Run("a pool without fencers or bouts serialises empty lists", func(t *testing.T) {
		t.Parallel()

		assert.NotNil(t, pool3.Fencers)
		assert.Empty(t, pool3.Fencers)
		assert.NotNil(t, pool3.Bouts)
		assert.Empty(t, pool3.Bouts)
	})
}

func TestGetPoolBoardByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		repo       *FakePoolBoardRepository
		id         string
		wantFence  int
		wantBouts  int
		wantCode   int
		wantDetail string
	}{
		{name: "returns that pool only", repo: seededBoardRepository(), id: boardPool2ID.String(), wantFence: 4, wantBouts: 2},
		{name: "returns a pool with nothing in it", repo: seededBoardRepository(), id: boardPool3ID.String()},
		{
			name:       "unknown id is not found",
			repo:       seededBoardRepository(),
			id:         uuid.New().String(),
			wantCode:   http.StatusNotFound,
			wantDetail: "not found",
		},
		{
			name:       "rejects a bad id",
			repo:       seededBoardRepository(),
			id:         "not-a-uuid",
			wantCode:   http.StatusBadRequest,
			wantDetail: "id must be a valid uuid",
		},
		{
			name:       "reports a repository failure as a server error",
			repo:       &FakePoolBoardRepository{Err: errors.New("connection refused")},
			id:         boardPool1ID.String(),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := poolboard.NewPoolBoardService(tt.repo).
				GetPoolBoardByID(t.Context(), &poolboard.PoolBoardIDInput{ID: tt.id})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.id, out.Body.ID)
			assert.Len(t, out.Body.Fencers, tt.wantFence)
			assert.Len(t, out.Body.Bouts, tt.wantBouts)
		})
	}
}
