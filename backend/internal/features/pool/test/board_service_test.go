package test

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"boutline/internal/features/pool"

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

// fencersOf seats the named fencers in position order, numbering competitors from first.
func fencersOf(poolID uuid.UUID, first int, names ...string) []pool.PoolBoardFencerRow {
	rows := make([]pool.PoolBoardFencerRow, 0, len(names))
	for i, name := range names {
		rows = append(rows, pool.PoolBoardFencerRow{
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

// order 0 leaves GroupSlot nil, like a bout added by hand.
func boutOf(n, order int, poolID uuid.UUID, status string, c1, score1, c2, score2 int) pool.PoolBoardBoutRow {
	var groupSlot *int
	if order > 0 {
		groupSlot = &order
	}

	return pool.PoolBoardBoutRow{
		ID:               boutID(n),
		PoolID:           poolID,
		GroupSlot:        groupSlot,
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
		Events: map[uuid.UUID][]pool.PoolBoardPoolRow{
			boardEventID: {
				{ID: boardPool1ID, PoolStageID: boardStageID, Number: 1, Strip: ptr("Strip 1"), StartedAt: &started},
				{ID: boardPool2ID, PoolStageID: boardStageID, Number: 2, StartedAt: &started, CompletedAt: &completed},
				{ID: boardPool3ID, PoolStageID: boardStageID, Number: 3, StartTime: &completed},
			},
		},
		Fencers: fencers,
		Bouts: []pool.PoolBoardBoutRow{
			boutOf(1, 1, boardPool1ID, "ended", 1, 5, 2, 2),
			boutOf(2, 2, boardPool1ID, "ended", 3, 5, 4, 3),
			boutOf(3, 3, boardPool1ID, "ended", 1, 5, 3, 4),
			boutOf(4, 4, boardPool1ID, "ended", 2, 2, 4, 5),
			boutOf(5, 5, boardPool1ID, "active", 1, 2, 4, 2),
			boutOf(6, 6, boardPool1ID, "upcoming", 2, 0, 3, 0),
			boutOf(7, 0, boardPool2ID, "ended", 5, 5, 6, 1),
			boutOf(8, 0, boardPool2ID, "ended", 7, 4, 8, 5),
		},
	}
}

func boardIDList(n int) string {
	ids := make([]string, n)
	for i := range ids {
		ids[i] = uuid.NewString()
	}

	return strings.Join(ids, ",")
}

func TestListPoolBoards(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		repo       *FakePoolBoardRepository
		input      *pool.PoolBoardListInput
		wantTotal  int64
		wantLen    int
		wantLimit  int
		wantOffset int
		wantNumber []int
		wantCode   int
		wantDetail string
	}{
		{
			name:      "returns every pool of the event",
			repo:      seededBoardRepository(),
			input:     &pool.PoolBoardListInput{EventID: boardEventID.String()},
			wantTotal: 3,
			wantLen:   3,
			wantLimit: pool.PoolBoardDefaultPageSize,
		},
		{
			name:       "pages with limit and offset while total ignores the page",
			repo:       seededBoardRepository(),
			input:      &pool.PoolBoardListInput{EventID: boardEventID.String(), Limit: 1, Offset: 1},
			wantTotal:  3,
			wantLen:    1,
			wantLimit:  1,
			wantOffset: 1,
		},
		{
			name:      "clamps a limit above the maximum",
			repo:      seededBoardRepository(),
			input:     &pool.PoolBoardListInput{EventID: boardEventID.String(), Limit: 500},
			wantTotal: 3,
			wantLen:   3,
			wantLimit: pool.PoolBoardMaxPageSize,
		},
		{
			name:      "an unknown event has no pools",
			repo:      seededBoardRepository(),
			input:     &pool.PoolBoardListInput{EventID: uuid.New().String()},
			wantLimit: pool.PoolBoardDefaultPageSize,
		},
		{
			name:       "returns just the named pools, as for a viewer's pins",
			repo:       seededBoardRepository(),
			input:      &pool.PoolBoardListInput{IDs: boardPool3ID.String() + "," + boardPool1ID.String()},
			wantTotal:  2,
			wantLen:    2,
			wantLimit:  pool.PoolBoardDefaultPageSize,
			wantNumber: []int{1, 3},
		},
		{
			name:       "narrows the event to the named pools",
			repo:       seededBoardRepository(),
			input:      &pool.PoolBoardListInput{EventID: boardEventID.String(), IDs: boardPool2ID.String()},
			wantTotal:  1,
			wantLen:    1,
			wantLimit:  pool.PoolBoardDefaultPageSize,
			wantNumber: []int{2},
		},
		{
			name:      "leaves out a named pool from another event",
			repo:      seededBoardRepository(),
			input:     &pool.PoolBoardListInput{EventID: uuid.New().String(), IDs: boardPool1ID.String()},
			wantLimit: pool.PoolBoardDefaultPageSize,
		},
		{
			name:       "rejects a request with neither event_id nor ids",
			repo:       seededBoardRepository(),
			input:      &pool.PoolBoardListInput{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide event_id, ids or both",
		},
		{
			name:       "rejects a malformed ids filter",
			repo:       seededBoardRepository(),
			input:      &pool.PoolBoardListInput{IDs: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "ids must be a valid uuid",
		},
		{
			name:       "rejects more ids than the maximum",
			repo:       seededBoardRepository(),
			input:      &pool.PoolBoardListInput{IDs: boardIDList(pool.PoolBoardMaxIDs + 1)},
			wantCode:   http.StatusBadRequest,
			wantDetail: fmt.Sprintf("ids must not contain more than %d values", pool.PoolBoardMaxIDs),
		},
		{
			name:       "rejects a bad event_id",
			repo:       seededBoardRepository(),
			input:      &pool.PoolBoardListInput{EventID: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "event_id must be a valid uuid",
		},
		{
			name:       "reports a repository failure as a server error",
			repo:       &FakePoolBoardRepository{Err: errors.New("connection refused")},
			input:      &pool.PoolBoardListInput{EventID: boardEventID.String()},
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := pool.NewPoolBoardService(tt.repo).ListPoolBoards(t.Context(), tt.input)

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
			if tt.wantNumber != nil {
				numbers := make([]int, 0, len(out.Body.Data))
				for _, board := range out.Body.Data {
					numbers = append(numbers, board.Number)
				}
				assert.Equal(t, tt.wantNumber, numbers)
			}
		})
	}
}

func TestListPoolBoardsContent(t *testing.T) {
	t.Parallel()

	out, err := pool.NewPoolBoardService(seededBoardRepository()).
		ListPoolBoards(t.Context(), &pool.PoolBoardListInput{EventID: boardEventID.String()})
	require.NoError(t, err)
	require.Len(t, out.Body.Data, 3)

	pool1, pool2, pool3 := out.Body.Data[0], out.Body.Data[1], out.Body.Data[2]

	t.Run("pools keep board order and derive status", func(t *testing.T) {
		t.Parallel()

		assert.Equal(t, []int{1, 2, 3}, []int{pool1.Number, pool2.Number, pool3.Number})
		assert.Equal(t,
			[]pool.PoolBoardStatus{pool.PoolBoardStatusActive, pool.PoolBoardStatusEnded, pool.PoolBoardStatusUpcoming},
			[]pool.PoolBoardStatus{pool1.Status, pool2.Status, pool3.Status})
	})

	t.Run("fencers are in position order with their standing", func(t *testing.T) {
		t.Parallel()

		require.Len(t, pool1.Fencers, 4)
		maya := pool1.Fencers[0]
		assert.Equal(t, competitorID(1).String(), maya.CompetitorID)
		assert.Equal(t, "Maya", maya.FirstName)
		assert.Equal(t, pool.PoolBoardStanding{
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

	t.Run("bouts carry their group slot, nil for a bout added by hand", func(t *testing.T) {
		t.Parallel()

		require.Len(t, pool2.Bouts, 2)
		require.NotNil(t, pool1.Bouts[0].GroupSlot)
		assert.Equal(t, 1, *pool1.Bouts[0].GroupSlot)
		for _, bout := range pool2.Bouts {
			assert.Nil(t, bout.GroupSlot)
		}
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

			out, err := pool.NewPoolBoardService(tt.repo).
				GetPoolBoardByID(t.Context(), &pool.PoolBoardIDInput{ID: tt.id})

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
