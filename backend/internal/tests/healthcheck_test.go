package tests

import (
	"net/http"
	"testing"

	"boutline/internal/config"
	"boutline/internal/tests/testkit"
	"boutline/internal/tests/testkit/fakes"
)

func TestRouting(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		route      string
		method     testkit.HTTPMethod
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "healthcheck reports the running app",
			route:      "/healthcheck",
			method:     testkit.GET,
			wantStatus: http.StatusOK,
			wantFields: map[string]any{
				"status":      "ok",
				"name":        config.DefaultAppName,
				"version":     config.DefaultAppVersion,
				"environment": fakes.TestEnvironment,
			},
		},
		{
			name:       "unknown route returns 404 with the requested path",
			route:      "/does-not-exist",
			method:     testkit.GET,
			wantStatus: http.StatusNotFound,
			wantFields: map[string]any{"error": "Route not found", "path": "/does-not-exist"},
		},
		{
			name:       "unsupported method on a known route returns 404",
			route:      "/healthcheck",
			method:     testkit.DELETE,
			wantStatus: http.StatusNotFound,
			wantFields: map[string]any{"error": "Route not found"},
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
				}).
				AssertStatus(tt.wantStatus)

			for field, want := range tt.wantFields {
				result.AssertField(field, want)
			}
		})
	}
}
