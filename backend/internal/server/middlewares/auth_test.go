package middlewares_test

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/user"
	"boutline/internal/server/middlewares"
	"boutline/internal/session"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testSecret = "middleware-test-jwt-secret-of-32-bytes+"

type fakeLookup struct {
	exists map[uuid.UUID]bool
	err    error
	calls  int
}

func (f *fakeLookup) UserExists(_ context.Context, id uuid.UUID) (bool, error) {
	f.calls++
	return f.exists[id], f.err
}

type echoOutput struct {
	Body struct {
		Caller string `json:"caller"`
	}
}

func newAPI(t *testing.T, lookup *fakeLookup) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	api.UseMiddleware(middlewares.NewAuthMiddleware(api, user.NewUserTokenManager(testSecret, time.Hour), lookup))

	echo := func(ctx context.Context, _ *struct{}) (*echoOutput, error) {
		out := &echoOutput{}
		out.Body.Caller = "anonymous"
		if id, ok := session.UserIDFrom(ctx); ok {
			out.Body.Caller = id.String()
		}
		return out, nil
	}
	huma.Register(api, huma.Operation{
		OperationID: "protectedEcho", Method: http.MethodGet, Path: "/protected", Security: user.UserBearerSecurity(),
	}, echo)
	huma.Register(api, huma.Operation{
		OperationID: "publicEcho", Method: http.MethodGet, Path: "/public", Security: []map[string][]string{},
	}, echo)

	return api
}

func TestAuthMiddleware(t *testing.T) {
	t.Parallel()

	known := uuid.New()
	missing := uuid.New()
	tokens := user.NewUserTokenManager(testSecret, time.Hour)
	bearer := func(manager *user.UserTokenManager, id uuid.UUID) string {
		token, err := manager.IssueToken(id)
		require.NoError(t, err)
		return "Bearer " + token
	}

	tests := []struct {
		name          string
		authorization string
		lookupErr     error
		protected     int
		wantCaller    string // echoed whenever the response is a 200
		wantLookups   int
	}{
		{name: "no token", protected: http.StatusUnauthorized, wantCaller: "anonymous"},
		{name: "garbage token", authorization: "Bearer garbage", protected: http.StatusUnauthorized, wantCaller: "anonymous"},
		{
			name:          "expired token",
			authorization: bearer(user.NewUserTokenManager(testSecret, -time.Minute), known),
			protected:     http.StatusUnauthorized, wantCaller: "anonymous",
		},
		{
			name:          "forged token",
			authorization: bearer(user.NewUserTokenManager("another-secret-of-at-least-32-bytes", time.Hour), known),
			protected:     http.StatusUnauthorized, wantCaller: "anonymous",
		},
		{
			name:          "garbage token with a failing lookup is a 401 and never looks up",
			authorization: "Bearer garbage", lookupErr: errors.New("db down"),
			protected: http.StatusUnauthorized, wantCaller: "anonymous",
		},
		{
			name:          "valid token for an existing user",
			authorization: bearer(tokens, known),
			protected:     http.StatusOK, wantCaller: known.String(), wantLookups: 1,
		},
		{
			name:          "valid token for a missing user",
			authorization: bearer(tokens, missing),
			protected:     http.StatusUnauthorized, wantCaller: "anonymous", wantLookups: 1,
		},
		{
			name:          "valid token with a failing lookup",
			authorization: bearer(tokens, known), lookupErr: errors.New("db down"),
			protected: http.StatusInternalServerError, wantCaller: "anonymous", wantLookups: 1,
		},
	}

	for _, tt := range tests {
		for _, route := range []struct {
			path string
			want int
		}{{"/protected", tt.protected}, {"/public", http.StatusOK}} {
			t.Run(tt.name+" "+route.path, func(t *testing.T) {
				t.Parallel()

				lookup := &fakeLookup{exists: map[uuid.UUID]bool{known: true}, err: tt.lookupErr}
				api := newAPI(t, lookup)

				var args []any
				if tt.authorization != "" {
					args = append(args, "Authorization: "+tt.authorization)
				}
				resp := api.Get(route.path, args...)

				assert.Equal(t, route.want, resp.Code)
				assert.Equal(t, tt.wantLookups, lookup.calls)
				switch route.want {
				case http.StatusOK:
					assert.JSONEq(t, `{"caller":"`+tt.wantCaller+`"}`, resp.Body.String())
				case http.StatusUnauthorized:
					assert.Equal(t, "Bearer", resp.Header().Get("WWW-Authenticate"))
					assert.Contains(t, resp.Body.String(), "unauthorized")
				case http.StatusInternalServerError:
					assert.Empty(t, resp.Header().Get("WWW-Authenticate"))
					assert.Contains(t, resp.Body.String(), "internal server error")
				}
			})
		}
	}
}
