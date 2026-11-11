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
	sheetEventID = uuid.MustParse("c0000000-0000-4000-8000-000000000001")
	sheetStageID = uuid.MustParse("f0000000-0000-4000-8000-000000000001")
	sheetPool1ID = uuid.MustParse("f1000000-0000-4000-8000-000000000001")
	sheetPool2ID = uuid.MustParse("f1000000-0000-4000-8000-000000000002")
	sheetPool3ID = uuid.MustParse("f1000000-0000-4000-8000-000000000003")
)

func competitorID(n int) uuid.UUID {
	return uuid.MustParse(fmt.Sprintf("d0000000-0000-4000-8000-%012d", n))
}

func boutID(n int) uuid.UUID {
	return uuid.MustParse(fmt.Sprintf("e0000000-0000-4000-8000-%012d", n))
}

// fencersOf seats the named fencers in position order, numbering competitors from first.
func fencersOf(poolID uuid.UUID, first int, names ...string) []pool.PoolSheetFencerRow {
	rows := make([]pool.PoolSheetFencerRow, 0, len(names))
	for i, name := range names {
		rows = append(rows, pool.PoolSheetFencerRow{
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

func boutOf(n, slot int, poolID uuid.UUID, status string, c1, score1, c2, score2 int) pool.PoolSheetBoutRow {
	return pool.PoolSheetBoutRow{
		ID:               boutID(n),
		PoolID:           poolID,
		Slot:             slot,
		Status:           status,
		Competitor1ID:    competitorID(c1),
		Competitor2ID:    competitorID(c2),
		Competitor1Score: score1,
		Competitor2Score: score2,
		Location:         ptr("Strip 1"),
	}
}

// seededSheetRepository holds one event with an active pool 1 and an ended pool 2 (both fenced
// round-robin so far) and an upcoming pool 3 that has no fencers or bouts yet.
func seededSheetRepository() *FakePoolSheetRepository {
	started := time.Date(2026, 10, 1, 9, 0, 0, 0, time.UTC)
	completed := started.Add(2 * time.Hour)

	fencers := fencersOf(sheetPool1ID, 1, "Maya", "Liam", "Priya", "Diego")
	fencers = append(fencers, fencersOf(sheetPool2ID, 5, "Hana", "Noah", "Amara", "Ethan")...)

	return &FakePoolSheetRepository{
		Events: map[uuid.UUID][]pool.PoolSheetPoolRow{
			sheetEventID: {
				{ID: sheetPool1ID, PoolStageID: sheetStageID, Number: 1, Strip: ptr("Strip 1"), StartedAt: &started},
				{ID: sheetPool2ID, PoolStageID: sheetStageID, Number: 2, StartedAt: &started, CompletedAt: &completed},
				{ID: sheetPool3ID, PoolStageID: sheetStageID, Number: 3, StartTime: &completed},
			},
		},
		Fencers: fencers,
		Bouts: []pool.PoolSheetBoutRow{
			boutOf(1, 1, sheetPool1ID, "ended", 1, 5, 2, 2),
			boutOf(2, 2, sheetPool1ID, "ended", 3, 5, 4, 3),
			boutOf(3, 3, sheetPool1ID, "ended", 1, 5, 3, 4),
			boutOf(4, 4, sheetPool1ID, "ended", 2, 2, 4, 5),
			boutOf(5, 5, sheetPool1ID, "active", 1, 2, 4, 2),
			boutOf(6, 6, sheetPool1ID, "upcoming", 2, 0, 3, 0),
			boutOf(7, 1, sheetPool2ID, "ended", 5, 5, 6, 1),
			boutOf(8, 2, sheetPool2ID, "ended", 7, 4, 8, 5),
		},
	}
}

func sheetIDList(n int) string {
	ids := make([]string, n)
	for i := range ids {
		ids[i] = uuid.NewString()
	}

	return strings.Join(ids, ",")
}

func TestListPoolSheets(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		repo       *FakePoolSheetRepository
		input      *pool.PoolSheetListInput
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
			repo:      seededSheetRepository(),
			input:     &pool.PoolSheetListInput{EventID: sheetEventID.String()},
			wantTotal: 3,
			wantLen:   3,
			wantLimit: pool.PoolSheetDefaultPageSize,
		},
		{
			name:       "pages with limit and offset while total ignores the page",
			repo:       seededSheetRepository(),
			input:      &pool.PoolSheetListInput{EventID: sheetEventID.String(), Limit: 1, Offset: 1},
			wantTotal:  3,
			wantLen:    1,
			wantLimit:  1,
			wantOffset: 1,
		},
		{
			name:      "clamps a limit above the maximum",
			repo:      seededSheetRepository(),
			input:     &pool.PoolSheetListInput{EventID: sheetEventID.String(), Limit: 500},
			wantTotal: 3,
			wantLen:   3,
			wantLimit: pool.PoolSheetMaxPageSize,
		},
		{
			name:      "an unknown event has no pools",
			repo:      seededSheetRepository(),
			input:     &pool.PoolSheetListInput{EventID: uuid.New().String()},
			wantLimit: pool.PoolSheetDefaultPageSize,
		},
		{
			name:       "returns just the named pools, as for a viewer's pins",
			repo:       seededSheetRepository(),
			input:      &pool.PoolSheetListInput{IDs: sheetPool3ID.String() + "," + sheetPool1ID.String()},
			wantTotal:  2,
			wantLen:    2,
			wantLimit:  pool.PoolSheetDefaultPageSize,
			wantNumber: []int{1, 3},
		},
		{
			name:       "narrows the event to the named pools",
			repo:       seededSheetRepository(),
			input:      &pool.PoolSheetListInput{EventID: sheetEventID.String(), IDs: sheetPool2ID.String()},
			wantTotal:  1,
			wantLen:    1,
			wantLimit:  pool.PoolSheetDefaultPageSize,
			wantNumber: []int{2},
		},
		{
			name:      "leaves out a named pool from another event",
			repo:      seededSheetRepository(),
			input:     &pool.PoolSheetListInput{EventID: uuid.New().String(), IDs: sheetPool1ID.String()},
			wantLimit: pool.PoolSheetDefaultPageSize,
		},
		{
			name:       "rejects a request with neither event_id nor ids",
			repo:       seededSheetRepository(),
			input:      &pool.PoolSheetListInput{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide event_id, ids or both",
		},
		{
			name:       "rejects a malformed ids filter",
			repo:       seededSheetRepository(),
			input:      &pool.PoolSheetListInput{IDs: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "ids must be a valid uuid",
		},
		{
			name:       "rejects more ids than the maximum",
			repo:       seededSheetRepository(),
			input:      &pool.PoolSheetListInput{IDs: sheetIDList(pool.PoolSheetMaxIDs + 1)},
			wantCode:   http.StatusBadRequest,
			wantDetail: fmt.Sprintf("ids must not contain more than %d values", pool.PoolSheetMaxIDs),
		},
		{
			name:       "rejects a bad event_id",
			repo:       seededSheetRepository(),
			input:      &pool.PoolSheetListInput{EventID: "not-a-uuid"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "event_id must be a valid uuid",
		},
		{
			name:       "reports a repository failure as a server error",
			repo:       &FakePoolSheetRepository{Err: errors.New("connection refused")},
			input:      &pool.PoolSheetListInput{EventID: sheetEventID.String()},
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := pool.NewPoolSheetService(tt.repo).ListPoolSheets(t.Context(), tt.input)

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
				for _, sheet := range out.Body.Data {
					numbers = append(numbers, sheet.Number)
				}
				assert.Equal(t, tt.wantNumber, numbers)
			}
		})
	}
}

func TestListPoolSheetsContent(t *testing.T) {
	t.Parallel()

	out, err := pool.NewPoolSheetService(seededSheetRepository()).
		ListPoolSheets(t.Context(), &pool.PoolSheetListInput{EventID: sheetEventID.String()})
	require.NoError(t, err)
	require.Len(t, out.Body.Data, 3)

	pool1, pool2, pool3 := out.Body.Data[0], out.Body.Data[1], out.Body.Data[2]

	t.Run("pools keep sheet order and derive status", func(t *testing.T) {
		t.Parallel()

		assert.Equal(t, []int{1, 2, 3}, []int{pool1.Number, pool2.Number, pool3.Number})
		assert.Equal(t,
			[]pool.PoolSheetStatus{pool.PoolSheetStatusActive, pool.PoolSheetStatusEnded, pool.PoolSheetStatusUpcoming},
			[]pool.PoolSheetStatus{pool1.Status, pool2.Status, pool3.Status})
	})

	t.Run("fencers are in position order with their standing", func(t *testing.T) {
		t.Parallel()

		require.Len(t, pool1.Fencers, 4)
		maya := pool1.Fencers[0]
		assert.Equal(t, competitorID(1).String(), maya.CompetitorID)
		assert.Equal(t, "Maya", maya.FirstName)
		assert.Equal(t, pool.PoolStanding{
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

	t.Run("bouts carry their slot", func(t *testing.T) {
		t.Parallel()

		require.Len(t, pool2.Bouts, 2)
		assert.Equal(t, 1, pool1.Bouts[0].Slot)
		assert.Equal(t, 2, pool2.Bouts[1].Slot)
	})

	t.Run("a pool without fencers or bouts serialises empty lists", func(t *testing.T) {
		t.Parallel()

		assert.NotNil(t, pool3.Fencers)
		assert.Empty(t, pool3.Fencers)
		assert.NotNil(t, pool3.Bouts)
		assert.Empty(t, pool3.Bouts)
	})
}

func TestGetPoolSheetByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		repo       *FakePoolSheetRepository
		id         string
		wantFence  int
		wantBouts  int
		wantCode   int
		wantDetail string
	}{
		{name: "returns that pool only", repo: seededSheetRepository(), id: sheetPool2ID.String(), wantFence: 4, wantBouts: 2},
		{name: "returns a pool with nothing in it", repo: seededSheetRepository(), id: sheetPool3ID.String()},
		{
			name:       "unknown id is not found",
			repo:       seededSheetRepository(),
			id:         uuid.New().String(),
			wantCode:   http.StatusNotFound,
			wantDetail: "not found",
		},
		{
			name:       "rejects a bad id",
			repo:       seededSheetRepository(),
			id:         "not-a-uuid",
			wantCode:   http.StatusBadRequest,
			wantDetail: "id must be a valid uuid",
		},
		{
			name:       "reports a repository failure as a server error",
			repo:       &FakePoolSheetRepository{Err: errors.New("connection refused")},
			id:         sheetPool1ID.String(),
			wantCode:   http.StatusInternalServerError,
			wantDetail: "internal server error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := pool.NewPoolSheetService(tt.repo).
				GetPoolSheetByID(t.Context(), &pool.PoolSheetIDInput{ID: tt.id})

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
