package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

const (
	seedAdminEmail   = "alex.morgan@boutline.dev"
	seedRefereeEmail = "jordan.lee@boutline.dev"
	seedOutsiderMail = "casey.nguyen@boutline.dev"

	// Mixed Épée's active pool stage, whose pools are still open.
	endStageID = "f0000000-0000-4000-8000-000000000001"
)

// seedUserToken logs in as a seeded user; an empty email returns no token.
func seedUserToken(t *testing.T, app *fiber.App, email string) string {
	t.Helper()

	if email == "" {
		return ""
	}

	login := testkit.New(t).
		Request(testkit.Request{
			App:    app,
			Route:  "/api/v1/auth/login",
			Method: testkit.POST,
			Body:   map[string]any{"email": email, "password": "password123"},
		}).
		AssertStatus(http.StatusOK)

	token, ok := login.GetBody()["token"].(string)
	require.True(t, ok, "token field is not a string: %v", login.GetBody())

	return token
}

func seedAuthHeaders(token string) map[string]string {
	if token == "" {
		return nil
	}

	return map[string]string{"Authorization": "Bearer " + token}
}

// Every case is rejected before the service writes, so the seeded Mixed Épée
// state that other database tests rely on is left alone.
func TestEndPoolStageRejectionsAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)

	tests := []struct {
		name   string
		email  string
		stage  string
		status int
		detail string
	}{
		{name: "no token", stage: endStageID, status: http.StatusUnauthorized},
		{
			name: "user outside the tournament", email: seedOutsiderMail, stage: endStageID,
			status: http.StatusForbidden, detail: "this requires the admin role in the tournament",
		},
		{
			name: "referee", email: seedRefereeEmail, stage: endStageID,
			status: http.StatusForbidden, detail: "this requires the admin role in the tournament",
		},
		{
			name: "admin with pools still open", email: seedAdminEmail, stage: endStageID,
			status: http.StatusConflict, detail: "every pool must end before the pool stage can end",
		},
		{name: "unknown stage", email: seedAdminEmail, stage: uuid.NewString(), status: http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := testkit.New(t).
				Request(testkit.Request{
					App:     app,
					Route:   "/api/v1/pool-stages/" + tt.stage + "/end",
					Method:  testkit.POST,
					Headers: seedAuthHeaders(seedUserToken(t, app, tt.email)),
				}).
				AssertStatus(tt.status)

			if tt.detail != "" {
				result.AssertField("detail", tt.detail)
			}
		})
	}
}
