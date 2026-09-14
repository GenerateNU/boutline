package tests

import (
	"net/http"
	"testing"

	"boutline/internal/tests/testkit"
	"boutline/internal/tests/testkit/fakes"
)

// The shared test app is built with a nil database, so these cases deliberately
// only use requests Huma settles against the schema before the handler runs.
// What they prove is that the operation is mounted in the real app — an
// unregistered path would fall through to the catch-all 404 instead.
func TestUserRoutesMounted(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		route      string
		method     testkit.HTTPMethod
		body       any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "create rejects an invalid body against the schema",
			route:      "/api/v1/users",
			method:     testkit.POST,
			body:       map[string]any{"email": "nope", "password": "short"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "the collection claims POST only",
			route:      "/api/v1/users",
			method:     testkit.GET,
			wantStatus: http.StatusNotFound,
			wantFields: map[string]any{"error": "Route not found", "path": "/api/v1/users"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			result := testkit.New(t).
				Request(testkit.Request{
					App:    fakes.GetSharedTestApp(),
					Route:  tt.route,
					Method: tt.method,
					Body:   tt.body,
				}).
				AssertStatus(tt.wantStatus)

			for field, want := range tt.wantFields {
				result.AssertField(field, want)
			}
		})
	}
}
