package tests

import (
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

const (
	// Mixed Épée's upcoming direct elimination, whose pool stage is still active.
	generateUpcomingDEID = "f0000000-0000-4000-8000-000000000002"
	// Open Épée's ended direct elimination, in a tournament Alex also administers.
	generateEndedDEID = "f0000000-0000-4000-8000-000000000001"
)

// Every case is rejected before the draw writes, so the seeded Mixed Épée
// tableau state that other database tests rely on is left alone.
func TestGenerateTableauRejectionsAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	tests := []struct {
		name   string
		email  string
		deID   string
		status int
		detail string
	}{
		{name: "no token", deID: generateUpcomingDEID, status: http.StatusUnauthorized},
		{
			name: "user outside the tournament", email: seedOutsiderMail, deID: generateUpcomingDEID,
			status: http.StatusForbidden, detail: "this requires the admin role in the tournament",
		},
		{
			name: "referee", email: seedRefereeEmail, deID: generateUpcomingDEID,
			status: http.StatusForbidden, detail: "this requires the admin role in the tournament",
		},
		{
			name: "admin before the pool stage ends", email: seedAdminEmail, deID: generateUpcomingDEID,
			status: http.StatusConflict, detail: "the event's pool stage must end before the tableau can be drawn",
		},
		{
			name: "admin on an ended direct elimination", email: seedAdminEmail, deID: generateEndedDEID,
			status: http.StatusConflict, detail: "only an upcoming direct elimination can be drawn",
		},
		{name: "unknown direct elimination", email: seedAdminEmail, deID: uuid.NewString(), status: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := testkit.New(t).
				Request(testkit.Request{
					App:     app,
					Route:   "/api/v1/direct-eliminations/" + tt.deID + "/generate",
					Method:  testkit.POST,
					Body:    map[string]any{},
					Headers: seedAuthHeaders(seedUserToken(t, app, tt.email)),
				}).
				AssertStatus(tt.status)

			if tt.detail != "" {
				result.AssertField("detail", tt.detail)
			}
		})
	}
}

// insertDrawFixture builds an event of the test's own, ready to draw: an active
// tournament Alex runs, three fencers in one ended pool, and an upcoming direct
// elimination. The pool bouts have no scorings, so all three tie and the draw seeds
// them at random. It returns the tournament and direct elimination IDs.
func insertDrawFixture(t *testing.T, db *gorm.DB) (uuid.UUID, uuid.UUID) {
	t.Helper()

	tournamentID, eventID, stageID, poolID, deID := uuid.New(), uuid.New(), uuid.New(), uuid.New(), uuid.New()
	competitorIDs := []uuid.UUID{uuid.New(), uuid.New(), uuid.New()}

	// The direct elimination has no foreign key to its event, so deleting the
	// tournament would leave it behind; bouts restrict every row they point at.
	t.Cleanup(func() {
		for _, cleanup := range []struct{ sql, id string }{
			{"DELETE FROM bouts WHERE tournament_id = ?", tournamentID.String()},
			{"DELETE FROM direct_eliminations WHERE id = ?", deID.String()},
			{"DELETE FROM tournaments WHERE id = ?", tournamentID.String()},
		} {
			if err := db.Exec(cleanup.sql, cleanup.id).Error; err != nil {
				t.Errorf("cleanup: %s: %v", cleanup.sql, err)
			}
		}
	})

	exec := func(sql string, values ...any) {
		t.Helper()
		require.NoError(t, db.Exec(sql, values...).Error)
	}
	exec(`INSERT INTO tournaments (id, name, visibility, code, status, created_by, created_at, updated_at)
		VALUES (?, 'Draw Fixture', 'private', ?, 'active', ?, now(), now())`,
		tournamentID, tournamentID.String()[:8], alexMorgan)
	exec(`INSERT INTO tournament_users (user_id, tournament_id, role, created_at, updated_at)
		VALUES (?, ?, 'admin', now(), now())`, alexMorgan, tournamentID)
	exec(`INSERT INTO events (id, tournament_id, name, status, created_at, updated_at)
		VALUES (?, ?, 'Draw Fixture Épée', 'active', now(), now())`, eventID, tournamentID)
	for i, id := range competitorIDs {
		exec(`INSERT INTO competitors (id, event_id, tournament_id, first_name, last_name, gender, birthdate, division, created_at, updated_at)
			VALUES (?, ?, ?, 'Fencer', ?, 'O', '2000-01-01', 'Massachusetts', now(), now())`,
			id, eventID, tournamentID, fmt.Sprintf("Draw %d", i+1))
	}
	exec(`INSERT INTO pool_stages (id, event_id, max_competitor_per_pool, status, created_at, updated_at)
		VALUES (?, ?, 4, 'ended', now(), now())`, stageID, eventID)
	exec(`INSERT INTO pools (id, pool_stage_id, number, created_at, updated_at)
		VALUES (?, ?, 1, now(), now())`, poolID, stageID)
	for slot, pair := range [][2]int{{0, 1}, {0, 2}, {1, 2}} {
		exec(`INSERT INTO bouts (tournament_id, points_to_win, status, competitor_1_id, competitor_2_id, pool_id, slot, created_at, updated_at)
			VALUES (?, 5, 'ended', ?, ?, ?, ?, now(), now())`,
			tournamentID, competitorIDs[pair[0]], competitorIDs[pair[1]], poolID, slot+1)
	}
	exec(`INSERT INTO direct_eliminations (id, status, event_id, created_at, updated_at)
		VALUES (?, 'upcoming', ?, now(), now())`, deID, eventID)

	return tournamentID, deID
}

// The fakes can't show that the lock query, the inserts, or the bout IDs the
// database generates actually work, so this draws a fresh event end to end.
func TestGenerateTableauDrawsAgainstRealDatabase(t *testing.T) {
	app, _, db := testkit.GetDBAndCacheTestApp(t)
	tournamentID, deID := insertDrawFixture(t, db)
	route := "/api/v1/direct-eliminations/" + deID.String() + "/generate"
	headers := seedAuthHeaders(seedUserToken(t, app, seedAdminEmail))

	body := testkit.New(t).
		Request(testkit.Request{App: app, Route: route, Method: testkit.POST, Body: map[string]any{}, Headers: headers}).
		AssertStatus(http.StatusOK).
		AssertField("bracket_size", float64(4)).
		GetBody()

	entries, ok := body["entries"].([]any)
	require.True(t, ok, "entries is not a list: %v", body)
	require.Len(t, entries, 3)
	seedOf := map[float64]string{}
	for _, raw := range entries {
		entry := raw.(map[string]any)
		seedOf[entry["seed"].(float64)] = entry["competitor_id"].(string)
	}
	require.Len(t, seedOf, 3, "seeds should be 1 to 3: %v", entries)

	// Four positions and three fencers: seed 1 has a bye, so the only bout is 2 v 3.
	bouts, ok := body["bouts"].([]any)
	require.True(t, ok, "bouts is not a list: %v", body)
	require.Len(t, bouts, 1)
	bout := bouts[0].(map[string]any)
	assert.Equal(t, float64(2), bout["slot"])
	assert.Equal(t, seedOf[2], bout["competitor_1_id"])
	assert.Equal(t, seedOf[3], bout["competitor_2_id"])

	var stored struct {
		TournamentID        uuid.UUID
		DirectEliminationID uuid.UUID
		RoundSize           int
		Slot                int
		PointsToWin         int
		TimeLimitSeconds    int
	}
	require.NoError(t, db.Raw(`SELECT tournament_id, direct_elimination_id, round_size, slot, points_to_win, time_limit_seconds
		FROM bouts WHERE id = ?`, bout["id"]).Scan(&stored).Error)
	assert.Equal(t, tournamentID, stored.TournamentID)
	assert.Equal(t, deID, stored.DirectEliminationID)
	assert.Equal(t, 4, stored.RoundSize)
	assert.Equal(t, 2, stored.Slot)
	assert.Equal(t, 15, stored.PointsToWin)
	assert.Equal(t, 180, stored.TimeLimitSeconds)

	testkit.New(t).
		Request(testkit.Request{App: app, Route: route, Method: testkit.POST, Body: map[string]any{}, Headers: headers}).
		AssertStatus(http.StatusConflict).
		AssertField("detail", "the tableau has already been drawn")
}
