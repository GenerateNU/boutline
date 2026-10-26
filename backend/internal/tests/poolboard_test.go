package tests

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/features/pool"
	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedCompetitorID(n int) string {
	return fmt.Sprintf("d0000000-0000-4000-8000-%012d", n)
}

func seedStanding(place, victories, matches, scored, received int) pool.PoolBoardStanding {
	standing := pool.PoolBoardStanding{
		Place:           place,
		Victories:       victories,
		Matches:         matches,
		TouchesScored:   scored,
		TouchesReceived: received,
		Indicator:       scored - received,
	}
	if matches > 0 {
		standing.VictoryRatio = float64(victories) / float64(matches)
	}

	return standing
}

// Exercises the pool board's aggregate SQL against seeds/seed.sql over a real
// Postgres connection: the SUM ... FILTER scores, the revoked-touch exclusion,
// fencers derived from the pool's bouts, and the fencer and bout ordering that
// a fake repository cannot check.
func TestPoolBoardsAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	const (
		fallOpenEpee = "c0000000-0000-4000-8000-000000000001"
		pool1ID      = "f1000000-0000-4000-8000-000000000001"
		pool2ID      = "f1000000-0000-4000-8000-000000000002"
		activeBoutID = "e0000000-0000-4000-8000-000000000005"
	)

	listed := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/pool-boards",
			Method: testkit.GET,
			Query:  map[string]string{"event_id": fallOpenEpee, "limit": "100"},
		}).
		AssertStatus(http.StatusOK)

	raw, err := json.Marshal(listed.GetBody())
	require.NoError(t, err)
	var body pool.PoolBoardListBody
	require.NoError(t, json.Unmarshal(raw, &body))

	require.EqualValues(t, 2, body.Total)
	require.Len(t, body.Data, 2)

	pool1 := body.Data[0]
	assert.Equal(t, pool1ID, pool1.ID)
	assert.Equal(t, 1, pool1.Number)
	require.NotNil(t, pool1.Strip)
	assert.Equal(t, "Strip 1", *pool1.Strip)
	assert.Equal(t, pool.PoolBoardStatusActive, pool1.Status)

	tests := []struct {
		name      string
		pool      pool.PoolBoardResponse
		standings []pool.PoolBoardStanding // in position order
		firstID   int
	}{
		{
			name: "pool 1",
			pool: body.Data[0],
			standings: []pool.PoolBoardStanding{
				seedStanding(1, 2, 2, 10, 6),
				seedStanding(4, 0, 2, 4, 10),
				seedStanding(2, 1, 2, 9, 8),
				seedStanding(3, 1, 2, 8, 7),
			},
			firstID: 1,
		},
		{
			name: "pool 2",
			pool: body.Data[1],
			standings: []pool.PoolBoardStanding{
				seedStanding(1, 1, 1, 5, 1),
				seedStanding(4, 0, 1, 1, 5),
				seedStanding(3, 0, 1, 4, 5),
				seedStanding(2, 1, 1, 5, 4),
			},
			firstID: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			require.Len(t, tt.pool.Fencers, len(tt.standings))
			for i, want := range tt.standings {
				fencer := tt.pool.Fencers[i]
				assert.Equal(t, seedCompetitorID(tt.firstID+i), fencer.CompetitorID)
				assert.Equal(t, i+1, fencer.Position)
				assert.Equal(t, want, fencer.Standing, "competitor %s", fencer.CompetitorID)
			}
		})
	}

	t.Run("bouts follow their group slots", func(t *testing.T) {
		for _, pool := range []struct {
			board   pool.PoolBoardResponse
			firstID int
		}{{body.Data[0], 1}, {body.Data[1], 7}} {
			require.Len(t, pool.board.Bouts, 6)
			for i, bout := range pool.board.Bouts {
				assert.Equal(t, fmt.Sprintf("e0000000-0000-4000-8000-%012d", pool.firstID+i), bout.ID)
				require.NotNil(t, bout.GroupSlot)
				assert.Equal(t, i+1, *bout.GroupSlot)
			}
		}
	})

	t.Run("an active bout has no winner", func(t *testing.T) {
		for _, bout := range pool1.Bouts {
			if bout.ID == activeBoutID {
				assert.Nil(t, bout.WinnerID)
				return
			}
		}
		t.Fatalf("bout %s missing from pool 1", activeBoutID)
	})

	t.Run("fetches a single pool board", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{App: app, Route: "/api/v1/pool-boards/" + pool2ID, Method: testkit.GET}).
			AssertStatus(http.StatusOK).
			AssertField("number", float64(2))
	})

	t.Run("fetches pinned pools by ids without an event", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/pool-boards",
				Method: testkit.GET,
				Query:  map[string]string{"ids": pool2ID + "," + uuid.NewString()},
			}).
			AssertStatus(http.StatusOK).
			AssertField("total", float64(1))
	})

	t.Run("an unknown pool is not found", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{App: app, Route: "/api/v1/pool-boards/" + uuid.NewString(), Method: testkit.GET}).
			AssertStatus(http.StatusNotFound)
	})
}
