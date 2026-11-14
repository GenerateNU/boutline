package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
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
