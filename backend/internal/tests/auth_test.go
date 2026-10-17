package tests

import (
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/user"
	"boutline/internal/tests/testkit"
	"boutline/internal/tests/testkit/fakes"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

// authHeaders signs a token with the secret fakes.TestConfiguration uses, so a
// request built with it passes the auth middleware on either test app.
func authHeaders(t *testing.T, userID uuid.UUID) map[string]string {
	t.Helper()

	return bearerHeaders(t, user.NewUserTokenManager(fakes.TestJWTSecret, user.UserTokenTTL), userID)
}

func bearerHeaders(t *testing.T, tokens *user.UserTokenManager, userID uuid.UUID) map[string]string {
	t.Helper()

	token, err := tokens.IssueToken(userID)
	require.NoError(t, err)

	return map[string]string{"Authorization": "Bearer " + token}
}

// Covers the auth middleware's public/protected split (reads public, writes
// protected, Security overriding either) and the signup/login
// validation paths over the shared app, which has no database — so only
// cases that never need to reach one. The DB-gated cases below exercise an
// actual login.
func TestAuthMiddleware(t *testing.T) {
	t.Parallel()

	app := fakes.GetSharedTestApp()
	valid := authHeaders(t, uuid.New())
	expired := bearerHeaders(t, user.NewUserTokenManager(fakes.TestJWTSecret, -time.Minute), uuid.New())
	forged := bearerHeaders(t, user.NewUserTokenManager("some-other-secret-at-least-32-bytes-long", time.Hour), uuid.New())

	tests := []struct {
		name       string
		route      string
		method     testkit.HTTPMethod
		headers    map[string]string
		body       any
		wantStatus int
	}{
		{
			name:       "healthcheck is public",
			route:      "/healthcheck",
			method:     testkit.GET,
			wantStatus: http.StatusOK,
		},
		{
			name:       "openapi spec is public",
			route:      "/openapi.json",
			method:     testkit.GET,
			wantStatus: http.StatusOK,
		},
		{
			name:       "docs UI is public",
			route:      "/docs",
			method:     testkit.GET,
			wantStatus: http.StatusOK,
		},
		{
			name:       "protected route without a token is unauthorized",
			route:      "/api/v1/users/not-a-uuid",
			method:     testkit.GET,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "protected route with a garbage token is unauthorized",
			route:      "/api/v1/users/not-a-uuid",
			method:     testkit.GET,
			headers:    map[string]string{"Authorization": "Bearer garbage"},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "protected route with an expired token is unauthorized",
			route:      "/api/v1/users/not-a-uuid",
			method:     testkit.GET,
			headers:    expired,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "protected route with a token signed by another secret is unauthorized",
			route:      "/api/v1/users/not-a-uuid",
			method:     testkit.GET,
			headers:    forged,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "protected route with a valid token reaches validation",
			route:      "/api/v1/users/not-a-uuid",
			method:     testkit.GET,
			headers:    valid,
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "reads are public by default",
			route:      "/api/v1/tournaments/not-a-uuid",
			method:     testkit.GET,
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "a public read ignores a bad token instead of rejecting it",
			route:      "/api/v1/tournaments/not-a-uuid",
			method:     testkit.GET,
			headers:    map[string]string{"Authorization": "Bearer garbage"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "writes are protected by default",
			route:      "/api/v1/tournaments/not-a-uuid",
			method:     testkit.PATCH,
			body:       map[string]any{},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "a protected write with a valid token reaches validation",
			route:      "/api/v1/tournaments/not-a-uuid",
			method:     testkit.PATCH,
			headers:    valid,
			body:       map[string]any{},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "login is public but still validates its body",
			route:      "/api/v1/auth/login",
			method:     testkit.POST,
			body:       map[string]any{},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "signup is public but still validates its body",
			route:      "/api/v1/auth/signup",
			method:     testkit.POST,
			body:       map[string]any{},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "POST to the users collection no longer exists",
			route:      "/api/v1/users",
			method:     testkit.POST,
			headers:    valid,
			wantStatus: http.StatusNotFound,
		},
		{
			name:   "CORS preflight on a protected route is not blocked by auth",
			route:  "/api/v1/users",
			method: http.MethodOptions,
			headers: map[string]string{
				"Origin":                        "http://example.com",
				"Access-Control-Request-Method": "GET",
			},
			wantStatus: http.StatusNoContent,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			testkit.New(t).
				Request(testkit.Request{
					App:     app,
					Route:   tt.route,
					Method:  tt.method,
					Headers: tt.headers,
					Body:    tt.body,
				}).
				AssertStatus(tt.wantStatus)
		})
	}
}

// Logs in against the seeded database (see seeds/seed.sql) and uses the
// resulting token to reach a protected route, so the full signing/parsing
// round trip runs against the same code production uses, not a fixed test
// secret pretending to be one.
func TestAuthLoginAgainstRealDatabase(t *testing.T) {
	app := testkit.GetDBTestApp(t)
	const seededEmail = "alex.morgan@boutline.dev"

	t.Run("wrong password is rejected", func(t *testing.T) {
		testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/auth/login",
				Method: testkit.POST,
				Body:   map[string]any{"email": seededEmail, "password": "not-the-password"},
			}).
			AssertStatus(http.StatusUnauthorized).
			AssertField("detail", "email or password is incorrect")
	})

	t.Run("correct password issues a token that authenticates later requests", func(t *testing.T) {
		login := testkit.New(t).
			Request(testkit.Request{
				App:    app,
				Route:  "/api/v1/auth/login",
				Method: testkit.POST,
				Body:   map[string]any{"email": seededEmail, "password": "password123"},
			}).
			AssertStatus(http.StatusOK).
			AssertFieldExists("token")

		token, ok := login.GetBody()["token"].(string)
		if !ok {
			t.Fatalf("token field is not a string: %v", login.GetBody())
		}

		testkit.New(t).
			Request(testkit.Request{
				App:     app,
				Route:   "/api/v1/users",
				Method:  testkit.GET,
				Headers: map[string]string{"Authorization": "Bearer " + token},
			}).
			AssertStatus(http.StatusOK)
	})
}
