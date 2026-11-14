package test

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestAPI(t *testing.T, seed ...tournament.Tournament) humatest.TestAPI {
	t.Helper()

	var staff []tournamentuser.TournamentUser
	for _, row := range seed {
		staff = append(staff, Staff(row.ID)...)
	}

	members := NewFakeTournamentUserRepository(staff...)
	repo := NewFakeTournamentRepository(seed...)
	repo.Members = members

	_, api := humatest.New(t)
	tournament.RegisterTournamentService(api, tournament.NewTournamentService(repo, members))

	return api
}

func decodeBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func TestCreateEndpoint(t *testing.T) {
	t.Parallel()

	creator := uuid.New().String()

	tests := []struct {
		name              string
		body              map[string]any
		wantStatus        int
		wantFields        map[string]any
		wantGeneratedCode bool
	}{
		{
			name:       "creates a tournament and echoes the stored row",
			body:       map[string]any{"name": "  from http  ", "created_by": creator},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"name":         "from http",
				"visibility":   "private",
				"status":       "pending",
				"created_by":   creator,
				"completed_at": nil,
			},
			wantGeneratedCode: true,
		},
		{
			name:       "rejects a blank name before the handler runs",
			body:       map[string]any{"name": "", "created_by": creator},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a missing created_by",
			body:       map[string]any{"name": "fine"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a created_by that is not a uuid",
			body:       map[string]any{"name": "fine", "created_by": "not-a-uuid"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a visibility outside the enum",
			body:       map[string]any{"name": "fine", "visibility": "nope", "created_by": creator},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses a client-supplied code",
			body:       map[string]any{"name": "fine", "created_by": creator, "code": "CHOSEN"},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newTestAPI(t)
			resp := api.Post("/api/v1/tournaments", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}

			if tt.wantGeneratedCode {
				code, ok := body["code"].(string)
				require.True(t, ok, "code missing from response")
				assert.Len(t, code, tournament.TournamentCodeLength)
				assert.Equal(t, strings.ToUpper(code), code)
			}

			if resp.Code == http.StatusCreated {
				id, ok := body["id"].(string)
				require.True(t, ok, "id missing from response")
				staff := decodeBody(t, api.Get("/api/v1/tournaments/"+id+"/users").Body.Bytes())
				rows, ok := staff["data"].([]any)
				require.True(t, ok, "data missing from response")
				require.Len(t, rows, 1, "the creator should be the only member")
				member, ok := rows[0].(map[string]any)
				require.True(t, ok)
				assert.Equal(t, creator, member["user_id"])
				assert.Equal(t, "admin", member["role"])
			}
		})
	}
}

func TestGetByIDEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", tournament.TournamentStatusPending)

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "returns the stored tournament", path: stored.ID.String(), wantStatus: http.StatusOK},
		{name: "reports an unknown id as not found", path: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects an id that is not a uuid", path: "not-a-uuid", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Get("/api/v1/tournaments/" + tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestGetByCodeEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", tournament.TournamentStatusPending)

	tests := []struct {
		name       string
		code       string
		wantStatus int
	}{
		{name: "finds the tournament from a lowercase code", code: strings.ToLower(stored.Code), wantStatus: http.StatusOK},
		{name: "finds the tournament from the stored code", code: stored.Code, wantStatus: http.StatusOK},
		{name: "reports an unknown code as not found", code: "ZZZZZZ", wantStatus: http.StatusNotFound},
		{name: "rejects a code shorter than six characters", code: "ABC", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, stored).Get("/api/v1/tournaments/code/" + tt.code)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestListEndpoint(t *testing.T) {
	t.Parallel()

	seed := []tournament.Tournament{
		seeded("a pending", tournament.TournamentStatusPending),
		seeded("b active", tournament.TournamentStatusActive),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?limit=500")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("rejects a status outside the enum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?status=nope")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("matches by name when a query is given", func(t *testing.T) {
		t.Parallel()

		named := []tournament.Tournament{
			seeded("Northwestern Open", tournament.TournamentStatusPending),
			seeded("Big Ten Championship", tournament.TournamentStatusActive),
		}
		resp := newTestAPI(t, named...).Get("/api/v1/tournaments?q=northwestern")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 1, body["total"], 0)
	})

	t.Run("accepts a URL-encoded offset", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, datedSeed()...).Get("/api/v1/tournaments?start_from=2026-06-01T05:30:00%2B05:30")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)
		assert.InDelta(t, 2, decodeBody(t, resp.Body.Bytes())["total"], 0)
	})

	t.Run("rejects a malformed start_from", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?start_from=not-a-time")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})

	t.Run("rejects a visibility outside the enum", func(t *testing.T) {
		t.Parallel()

		resp := newTestAPI(t, seed...).Get("/api/v1/tournaments?visibility=secret")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func datedSeed() []tournament.Tournament {
	day := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	first := seeded("first", tournament.TournamentStatusPending)
	first.StartTime = &day
	next := day.Add(24 * time.Hour)
	second := seeded("second", tournament.TournamentStatusPending)
	second.StartTime = &next

	return []tournament.Tournament{first, second}
}

func TestUpdateEndpoint(t *testing.T) {
	t.Parallel()

	stored := seeded("before", tournament.TournamentStatusPending)

	tests := []struct {
		name       string
		path       string
		body       map[string]any
		caller     Caller
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "patches only the fields present in the body",
			path:       stored.ID.String(),
			body:       map[string]any{"visibility": "public"},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"name": "before", "visibility": "public"},
		},
		{
			name:       "rejects a visibility outside the enum before the service runs",
			path:       stored.ID.String(),
			body:       map[string]any{"visibility": "nope"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects an empty patch",
			path:       stored.ID.String(),
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
			wantFields: map[string]any{"detail": "provide at least one field to update"},
		},
		{
			name:       "refuses an unknown id, since nobody holds a role in it",
			path:       uuid.New().String(),
			body:       map[string]any{"name": "after"},
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
		{
			name:       "refuses a caller who is not signed in",
			path:       stored.ID.String(),
			body:       map[string]any{"name": "after"},
			caller:     CallerAnonymous,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
		{
			name:       "refuses a user who is not a member",
			path:       stored.ID.String(),
			body:       map[string]any{"name": "after"},
			caller:     CallerStranger,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
		{
			name:       "refuses a referee",
			path:       stored.ID.String(),
			body:       map[string]any{"name": "after"},
			caller:     CallerReferee,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newTestAPI(t, stored)
			resp := api.PatchCtx(tt.caller.Context(t.Context()), "/api/v1/tournaments/"+tt.path, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}

			if tt.wantStatus == http.StatusForbidden {
				got := decodeBody(t, api.Get("/api/v1/tournaments/"+stored.ID.String()).Body.Bytes())
				assert.Equal(t, "before", got["name"])
			}
		})
	}
}

func TestLifecycleEndpoints(t *testing.T) {
	t.Parallel()

	stored := seeded("bracket", tournament.TournamentStatusPending)
	api := newTestAPI(t, stored)
	base := "/api/v1/tournaments/" + stored.ID.String()
	admin := CallerAdmin.Context(t.Context())

	started := api.PostCtx(admin, base+"/start")
	require.Equal(t, http.StatusOK, started.Code, "body: %s", started.Body)
	assert.Equal(t, "active", decodeBody(t, started.Body.Bytes())["status"])

	assert.Equal(t, http.StatusConflict, api.PostCtx(admin, base+"/start").Code)

	completed := api.PostCtx(admin, base+"/complete")
	require.Equal(t, http.StatusOK, completed.Code, "body: %s", completed.Body)

	completedBody := decodeBody(t, completed.Body.Bytes())
	assert.Equal(t, "ended", completedBody["status"])
	assert.NotNil(t, completedBody["completed_at"])

	assert.Equal(t, http.StatusConflict, api.PostCtx(admin, base+"/complete").Code)
	assert.Equal(t, http.StatusConflict, api.PostCtx(admin, base+"/start").Code)

	edit := api.PatchCtx(admin, base, map[string]any{"name": "too late"})
	require.Equal(t, http.StatusConflict, edit.Code, "body: %s", edit.Body)
	assert.Equal(t, "tournament has ended and can no longer be edited",
		decodeBody(t, edit.Body.Bytes())["detail"])
}

func TestLifecycleEndpointsRequireAnAdmin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		action     string
		seedStatus tournament.TournamentStatus
	}{
		{name: "start", action: "start", seedStatus: tournament.TournamentStatusPending},
		{name: "complete", action: "complete", seedStatus: tournament.TournamentStatusActive},
	}
	callers := map[string]Caller{
		"no caller":  CallerAnonymous,
		"non-member": CallerStranger,
		"referee":    CallerReferee,
	}

	for _, tt := range tests {
		for who, caller := range callers {
			t.Run(tt.name+" refuses "+who, func(t *testing.T) {
				t.Parallel()

				stored := seeded("bracket", tt.seedStatus)
				api := newTestAPI(t, stored)
				path := "/api/v1/tournaments/" + stored.ID.String()

				resp := api.PostCtx(caller.Context(t.Context()), path+"/"+tt.action)

				require.Equal(t, http.StatusForbidden, resp.Code, "body: %s", resp.Body)
				got := decodeBody(t, api.Get(path).Body.Bytes())
				assert.Equal(t, string(tt.seedStatus), got["status"])
			})
		}
	}
}

func newMembershipTestAPI(t *testing.T, seed ...tournamentuser.TournamentUser) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	tournament.RegisterTournamentService(api,
		tournament.NewTournamentService(NewFakeTournamentRepository(), NewFakeTournamentUserRepository(seed...)))

	return api
}

func TestAddTournamentUserEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	member := uuid.New()

	tests := []struct {
		name       string
		path       string
		body       map[string]any
		caller     Caller
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "adds a referee",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "referee"},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"role": "referee", "tournament_id": tournamentID.String()},
		},
		{
			name:       "adds an admin",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "admin"},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"role": "admin"},
		},
		{
			name:       "rejects a role outside the enum before the service runs",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "scorekeeper"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a user_id that is not a uuid",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": "not-a-uuid", "role": "referee"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects a tournament id that is not a uuid",
			path:       "not-a-uuid",
			body:       map[string]any{"user_id": uuid.New().String(), "role": "referee"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "reports an already-added user as a conflict",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": member.String(), "role": "admin"},
			wantStatus: http.StatusConflict,
		},
		{
			name:       "refuses a caller who is not signed in",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "referee"},
			caller:     CallerAnonymous,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
		{
			name:       "refuses a user who is not a member",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "referee"},
			caller:     CallerStranger,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
		{
			name:       "refuses a referee",
			path:       tournamentID.String(),
			body:       map[string]any{"user_id": uuid.New().String(), "role": "referee"},
			caller:     CallerReferee,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newMembershipTestAPI(t, append(Staff(tournamentID),
				seededMembership(tournamentID, member, tournamentuser.TournamentUserRoleReferee))...)
			resp := api.PostCtx(tt.caller.Context(t.Context()), "/api/v1/tournaments/"+tt.path+"/users", tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}

			if tt.wantStatus == http.StatusForbidden {
				list := decodeBody(t, api.Get("/api/v1/tournaments/"+tt.path+"/users").Body.Bytes())
				assert.EqualValues(t, 3, list["total"])
			}
		})
	}
}

func TestListUsersByTournamentEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	seed := []tournamentuser.TournamentUser{
		seededMembership(tournamentID, uuid.New(), tournamentuser.TournamentUserRoleReferee),
		seededMembership(tournamentID, uuid.New(), tournamentuser.TournamentUserRoleAdmin),
		seededMembership(uuid.New(), uuid.New(), tournamentuser.TournamentUserRoleAdmin),
	}

	t.Run("returns a page and the unpaged total", func(t *testing.T) {
		t.Parallel()

		resp := newMembershipTestAPI(t, seed...).Get("/api/v1/tournaments/" + tournamentID.String() + "/users?limit=1")

		require.Equal(t, http.StatusOK, resp.Code, "body: %s", resp.Body)

		body := decodeBody(t, resp.Body.Bytes())
		assert.Len(t, body["data"], 1)
		assert.InDelta(t, 2, body["total"], 0)
		assert.InDelta(t, 1, body["limit"], 0)
	})

	t.Run("rejects a limit above the maximum", func(t *testing.T) {
		t.Parallel()

		resp := newMembershipTestAPI(t, seed...).Get("/api/v1/tournaments/" + tournamentID.String() + "/users?limit=500")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestUpdateTournamentUserRoleEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	member := uuid.New()

	tests := []struct {
		name       string
		userPath   string
		body       map[string]any
		caller     Caller
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "promotes a referee to admin",
			userPath:   member.String(),
			body:       map[string]any{"role": "admin"},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"role": "admin", "user_id": member.String()},
		},
		{
			name:       "rejects a role outside the enum",
			userPath:   member.String(),
			body:       map[string]any{"role": "nope"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "reports a non-member as not found",
			userPath:   uuid.New().String(),
			body:       map[string]any{"role": "admin"},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "refuses a caller who is not signed in",
			userPath:   member.String(),
			body:       map[string]any{"role": "admin"},
			caller:     CallerAnonymous,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
		{
			name:       "refuses a user who is not a member",
			userPath:   member.String(),
			body:       map[string]any{"role": "admin"},
			caller:     CallerStranger,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
		{
			name:       "refuses a referee",
			userPath:   member.String(),
			body:       map[string]any{"role": "admin"},
			caller:     CallerReferee,
			wantStatus: http.StatusForbidden,
			wantFields: map[string]any{"detail": "this requires the admin role in the tournament"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newMembershipTestAPI(t, append(Staff(tournamentID),
				seededMembership(tournamentID, member, tournamentuser.TournamentUserRoleReferee))...)
			resp := api.PatchCtx(tt.caller.Context(t.Context()),
				"/api/v1/tournaments/"+tournamentID.String()+"/users/"+tt.userPath, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}

			if tt.wantStatus == http.StatusForbidden {
				list := decodeBody(t, api.Get("/api/v1/tournaments/"+tournamentID.String()+"/users").Body.Bytes())
				for _, row := range list["data"].([]any) {
					if row.(map[string]any)["user_id"] == member.String() {
						assert.Equal(t, "referee", row.(map[string]any)["role"])
					}
				}
			}
		})
	}
}

func TestRemoveTournamentUserEndpoint(t *testing.T) {
	t.Parallel()

	tournamentID := uuid.New()
	member := uuid.New()
	api := newMembershipTestAPI(t, append(Staff(tournamentID),
		seededMembership(tournamentID, member, tournamentuser.TournamentUserRoleReferee))...)
	path := "/api/v1/tournaments/" + tournamentID.String() + "/users/" + member.String()
	admin := CallerAdmin.Context(t.Context())

	for who, caller := range map[string]Caller{
		"no caller":  CallerAnonymous,
		"non-member": CallerStranger,
		"referee":    CallerReferee,
	} {
		denied := api.DeleteCtx(caller.Context(t.Context()), path)
		require.Equal(t, http.StatusForbidden, denied.Code, "%s: %s", who, denied.Body)
	}

	list := decodeBody(t, api.Get("/api/v1/tournaments/"+tournamentID.String()+"/users").Body.Bytes())
	assert.EqualValues(t, 3, list["total"])

	removed := api.DeleteCtx(admin, path)
	require.Equal(t, http.StatusNoContent, removed.Code, "body: %s", removed.Body)
	assert.Empty(t, removed.Body.Bytes())

	assert.Equal(t, http.StatusNotFound, api.DeleteCtx(admin, path).Code)
}

func TestLocationEndpoints(t *testing.T) {
	t.Parallel()

	creator := uuid.New().String()
	located := withLocation(seeded("located", tournament.TournamentStatusPending), "Boston", "US")

	tests := []struct {
		name       string
		method     string
		path       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "create echoes city and country",
			method:     http.MethodPost,
			path:       "/api/v1/tournaments",
			body:       map[string]any{"name": "n", "created_by": creator, "city": " Boston ", "country": "US"},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"city": "Boston", "country": "US"},
		},
		{
			name:       "create without a location returns nulls",
			method:     http.MethodPost,
			path:       "/api/v1/tournaments",
			body:       map[string]any{"name": "n", "created_by": creator},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{"city": nil, "country": nil},
		},
		{
			name:       "create rejects a lowercase country",
			method:     http.MethodPost,
			path:       "/api/v1/tournaments",
			body:       map[string]any{"name": "n", "created_by": creator, "country": "us"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "patch with an empty city clears it",
			method:     http.MethodPatch,
			path:       "/api/v1/tournaments/" + located.ID.String(),
			body:       map[string]any{"city": ""},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"city": nil, "country": "US"},
		},
		{
			name:       "patch with only a country succeeds",
			method:     http.MethodPatch,
			path:       "/api/v1/tournaments/" + located.ID.String(),
			body:       map[string]any{"country": "CA"},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"city": "Boston", "country": "CA"},
		},
		{
			name:       "patch with an empty country clears it",
			method:     http.MethodPatch,
			path:       "/api/v1/tournaments/" + located.ID.String(),
			body:       map[string]any{"country": ""},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"country": nil},
		},
		{
			name:       "patch rejects a malformed country",
			method:     http.MethodPatch,
			path:       "/api/v1/tournaments/" + located.ID.String(),
			body:       map[string]any{"country": "USA"},
			wantStatus: http.StatusUnprocessableEntity,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, located).DoCtx(CallerAdmin.Context(t.Context()), tt.method, tt.path, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestListEndpointLocationFilters(t *testing.T) {
	t.Parallel()

	us := withLocation(seeded("us", tournament.TournamentStatusPending), "Boston", "US")
	ca := withLocation(seeded("ca", tournament.TournamentStatusPending), "Toronto", "CA")
	unplaced := seeded("unplaced", tournament.TournamentStatusPending)

	tests := []struct {
		name       string
		query      string
		wantStatus int
		wantTotal  float64
	}{
		{name: "country filters to an exact code", query: "?country=US", wantStatus: http.StatusOK, wantTotal: 1},
		{name: "omitting country applies no filter", query: "", wantStatus: http.StatusOK, wantTotal: 3},
		{name: "rejects a lowercase country", query: "?country=us", wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects a three-letter country", query: "?country=USA", wantStatus: http.StatusUnprocessableEntity},
		{name: "club is accepted and matches nothing here", query: "?club=Nowhere", wantStatus: http.StatusOK, wantTotal: 0},
		{name: "rejects an overlong club", query: "?club=" + strings.Repeat("x", 121), wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, us, ca, unplaced).Get("/api/v1/tournaments" + tt.query)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
			if tt.wantStatus == http.StatusOK {
				assert.InDelta(t, tt.wantTotal, decodeBody(t, resp.Body.Bytes())["total"], 0)
			}
		})
	}
}

func TestCountriesEndpoint(t *testing.T) {
	t.Parallel()

	row := func(name, country string, visibility tournament.TournamentVisibility) tournament.Tournament {
		located := withLocation(seeded(name, tournament.TournamentStatusPending), "Anywhere", country)
		located.Visibility = visibility

		return located
	}
	seed := []tournament.Tournament{
		row("a", "US", tournament.TournamentVisibilityPublic),
		row("b", "US", tournament.TournamentVisibilityPrivate),
		row("c", "CA", tournament.TournamentVisibilityPrivate),
		seeded("unset", tournament.TournamentStatusPending),
	}

	tests := []struct {
		name       string
		query      string
		wantStatus int
		wantData   []any
		wantTotal  float64
	}{
		{
			name:       "groups counts sorted by code",
			query:      "",
			wantStatus: http.StatusOK,
			wantData: []any{
				map[string]any{"code": "CA", "tournament_count": float64(1)},
				map[string]any{"code": "US", "tournament_count": float64(2)},
			},
			wantTotal: 2,
		},
		{
			name:       "respects visibility",
			query:      "?visibility=public",
			wantStatus: http.StatusOK,
			wantData:   []any{map[string]any{"code": "US", "tournament_count": float64(1)}},
			wantTotal:  1,
		},
		{name: "rejects a zero limit", query: "?limit=0", wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects a limit above the maximum", query: "?limit=251", wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects a visibility outside the enum", query: "?visibility=secret", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newTestAPI(t, seed...).Get("/api/v1/countries" + tt.query)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
			if tt.wantStatus != http.StatusOK {
				return
			}

			body := decodeBody(t, resp.Body.Bytes())
			assert.Equal(t, tt.wantData, body["data"])
			assert.InDelta(t, tt.wantTotal, body["total"], 0)
		})
	}
}
