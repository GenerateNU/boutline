package test

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/directelimination"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const directEliminationsPath = "/api/v1/direct-eliminations"

func newDirectEliminationTestAPI(
	t *testing.T,
	seed ...directelimination.DirectElimination,
) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	directelimination.RegisterDirectEliminationService(api,
		NewTestService(NewFakeDirectEliminationRepository(seed...)))

	return api
}

func decodeDirectEliminationBody(t *testing.T, raw []byte) map[string]any {
	t.Helper()

	var body map[string]any
	require.NoError(t, json.Unmarshal(raw, &body))

	return body
}

func seededDirectElimination(
	eventID uuid.UUID,
	status directelimination.DirectEliminationStatus,
) directelimination.DirectElimination {
	now := time.Now()

	return directelimination.DirectElimination{
		ID:        uuid.New(),
		EventID:   eventID,
		Status:    status,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

func TestDirectEliminationCreateEndpoint(t *testing.T) {
	t.Parallel()

	eventID := TestEventID.String()

	tests := []struct {
		name       string
		caller     uuid.UUID
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "creates an upcoming round and echoes the stored row",
			caller:     TestAdminID,
			body:       map[string]any{"event_id": eventID},
			wantStatus: http.StatusCreated,
			wantFields: map[string]any{
				"status":       "upcoming",
				"event_id":     eventID,
				"started_at":   nil,
				"completed_at": nil,
			},
		},
		{
			name:       "rejects a missing event_id",
			caller:     TestAdminID,
			body:       map[string]any{},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects an event_id that is not a uuid",
			caller:     TestAdminID,
			body:       map[string]any{"event_id": "not-a-uuid"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses a client-supplied status",
			caller:     TestAdminID,
			body:       map[string]any{"event_id": eventID, "status": "active"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses client-supplied timestamps",
			caller:     TestAdminID,
			body:       map[string]any{"event_id": eventID, "started_at": "2026-01-01T00:00:00Z"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "reports an event that does not exist as not found",
			caller:     TestAdminID,
			body:       map[string]any{"event_id": uuid.New().String()},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "refuses an anonymous caller",
			body:       map[string]any{"event_id": eventID},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "refuses a caller who is not in the tournament",
			caller:     TestOutsiderID,
			body:       map[string]any{"event_id": eventID},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "refuses a referee",
			caller:     TestRefereeID,
			body:       map[string]any{"event_id": eventID},
			wantStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newDirectEliminationTestAPI(t)
			resp := api.PostCtx(ctxAs(t, tt.caller), directEliminationsPath, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			body := decodeDirectEliminationBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
			if tt.wantStatus == http.StatusForbidden {
				assert.Empty(t, decodeDirectEliminationBody(t, api.Get(directEliminationsPath).Body.Bytes())["data"])
			}
			if tt.wantStatus == http.StatusCreated {
				_, err := uuid.Parse(body["id"].(string))
				assert.NoError(t, err, "id should be a uuid")
			}
		})
	}
}

func TestDirectEliminationGetByIDEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededDirectElimination(uuid.New(), directelimination.DirectEliminationStatusUpcoming)

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "returns the stored round", path: stored.ID.String(), wantStatus: http.StatusOK},
		{name: "reports an unknown id as not found", path: uuid.New().String(), wantStatus: http.StatusNotFound},
		{name: "rejects an id that is not a uuid", path: "not-a-uuid", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newDirectEliminationTestAPI(t, stored).Get(directEliminationsPath + "/" + tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

func TestDirectEliminationListEndpoint(t *testing.T) {
	t.Parallel()

	eventA := uuid.New()
	eventB := uuid.New()
	seed := []directelimination.DirectElimination{
		seededDirectElimination(eventA, directelimination.DirectEliminationStatusUpcoming),
		seededDirectElimination(eventA, directelimination.DirectEliminationStatusActive),
		seededDirectElimination(eventB, directelimination.DirectEliminationStatusActive),
	}

	tests := []struct {
		name       string
		query      string
		wantStatus int
		wantTotal  int
	}{
		{name: "returns every round without filters", query: "", wantStatus: http.StatusOK, wantTotal: 3},
		{name: "filters by event_id", query: "?event_id=" + eventA.String(), wantStatus: http.StatusOK, wantTotal: 2},
		{name: "filters by status", query: "?status=active", wantStatus: http.StatusOK, wantTotal: 2},
		{
			name:       "combines event_id and status",
			query:      "?event_id=" + eventA.String() + "&status=active",
			wantStatus: http.StatusOK,
			wantTotal:  1,
		},
		{name: "returns an empty list when nothing matches", query: "?status=ended", wantStatus: http.StatusOK, wantTotal: 0},
		{name: "rejects a status outside the enum", query: "?status=nope", wantStatus: http.StatusUnprocessableEntity},
		{name: "rejects an event_id that is not a uuid", query: "?event_id=nope", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := newDirectEliminationTestAPI(t, seed...).Get(directEliminationsPath + tt.query)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			if tt.wantStatus == http.StatusOK {
				body := decodeDirectEliminationBody(t, resp.Body.Bytes())
				assert.Len(t, body["data"], tt.wantTotal)
				assert.InDelta(t, tt.wantTotal, body["total"], 0)
			}
		})
	}
}

func TestDirectEliminationUpdateEndpoint(t *testing.T) {
	t.Parallel()

	newEvent := TestSecondEventID.String()
	stored := seededDirectElimination(TestEventID, directelimination.DirectEliminationStatusUpcoming)

	tests := []struct {
		name       string
		caller     uuid.UUID
		path       string
		body       map[string]any
		wantStatus int
		wantFields map[string]any
	}{
		{
			name:       "moves the round to another event",
			caller:     TestAdminID,
			path:       stored.ID.String(),
			body:       map[string]any{"event_id": newEvent},
			wantStatus: http.StatusOK,
			wantFields: map[string]any{"event_id": newEvent, "status": "upcoming"},
		},
		{
			name:       "rejects an event_id that is not a uuid",
			caller:     TestAdminID,
			path:       stored.ID.String(),
			body:       map[string]any{"event_id": "not-a-uuid"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses to set status through a patch",
			caller:     TestAdminID,
			path:       stored.ID.String(),
			body:       map[string]any{"status": "ended"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "refuses to set timestamps through a patch",
			caller:     TestAdminID,
			path:       stored.ID.String(),
			body:       map[string]any{"completed_at": "2026-01-01T00:00:00Z"},
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "rejects an empty patch",
			caller:     TestAdminID,
			path:       stored.ID.String(),
			body:       map[string]any{},
			wantStatus: http.StatusBadRequest,
			wantFields: map[string]any{"detail": "provide at least one field to update"},
		},
		{
			name:       "reports an unknown id as not found",
			caller:     TestAdminID,
			path:       uuid.New().String(),
			body:       map[string]any{"event_id": newEvent},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "reports the target event not existing as not found",
			caller:     TestAdminID,
			path:       stored.ID.String(),
			body:       map[string]any{"event_id": uuid.New().String()},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "refuses to move the round into a tournament the caller does not administer",
			caller:     TestAdminID,
			path:       stored.ID.String(),
			body:       map[string]any{"event_id": OtherEventID.String()},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "refuses an anonymous caller",
			path:       stored.ID.String(),
			body:       map[string]any{"event_id": newEvent},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "refuses a caller who is not in the tournament",
			caller:     TestOutsiderID,
			path:       stored.ID.String(),
			body:       map[string]any{"event_id": newEvent},
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "refuses a referee",
			caller:     TestRefereeID,
			path:       stored.ID.String(),
			body:       map[string]any{"event_id": newEvent},
			wantStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			api := newDirectEliminationTestAPI(t, stored)
			resp := api.PatchCtx(ctxAs(t, tt.caller), directEliminationsPath+"/"+tt.path, tt.body)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)

			if tt.wantStatus == http.StatusForbidden {
				unchanged := decodeDirectEliminationBody(t, api.Get(directEliminationsPath+"/"+tt.path).Body.Bytes())
				assert.Equal(t, TestEventID.String(), unchanged["event_id"])
			}

			body := decodeDirectEliminationBody(t, resp.Body.Bytes())
			for field, want := range tt.wantFields {
				assert.Equal(t, want, body[field])
			}
		})
	}
}

func TestDirectEliminationDeleteEndpoint(t *testing.T) {
	t.Parallel()

	t.Run("deletes the round and then reports it as not found", func(t *testing.T) {
		t.Parallel()

		stored := seededDirectElimination(TestEventID, directelimination.DirectEliminationStatusUpcoming)
		api := newDirectEliminationTestAPI(t, stored)
		path := directEliminationsPath + "/" + stored.ID.String()
		admin := ctxAs(t, TestAdminID)

		deleted := api.DeleteCtx(admin, path)
		require.Equal(t, http.StatusNoContent, deleted.Code, "body: %s", deleted.Body)

		assert.Equal(t, http.StatusNotFound, api.Get(path).Code)
		assert.Equal(t, http.StatusNotFound, api.DeleteCtx(admin, path).Code)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		resp := newDirectEliminationTestAPI(t).DeleteCtx(ctxAs(t, TestAdminID), directEliminationsPath+"/"+uuid.New().String())

		assert.Equal(t, http.StatusNotFound, resp.Code)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		resp := newDirectEliminationTestAPI(t).DeleteCtx(ctxAs(t, TestAdminID), directEliminationsPath+"/not-a-uuid")

		assert.Equal(t, http.StatusUnprocessableEntity, resp.Code)
	})
}

func TestDirectEliminationMutationsRequireAdminEndpoint(t *testing.T) {
	t.Parallel()

	stored := seededDirectElimination(TestEventID, directelimination.DirectEliminationStatusUpcoming)
	path := directEliminationsPath + "/" + stored.ID.String()

	operations := []struct {
		name string
		do   func(api humatest.TestAPI, ctx context.Context) int
	}{
		{"delete", func(api humatest.TestAPI, ctx context.Context) int { return api.DeleteCtx(ctx, path).Code }},
		{"start", func(api humatest.TestAPI, ctx context.Context) int { return api.PostCtx(ctx, path+"/start").Code }},
		{"complete", func(api humatest.TestAPI, ctx context.Context) int { return api.PostCtx(ctx, path+"/complete").Code }},
	}
	callers := []struct {
		name   string
		caller uuid.UUID
	}{
		{"anonymous", uuid.Nil},
		{"non-member", TestOutsiderID},
		{"referee", TestRefereeID},
	}

	for _, op := range operations {
		for _, c := range callers {
			t.Run(op.name+" refuses "+c.name, func(t *testing.T) {
				t.Parallel()

				api := newDirectEliminationTestAPI(t, stored)

				require.Equal(t, http.StatusForbidden, op.do(api, ctxAs(t, c.caller)))

				unchanged := api.Get(path)
				require.Equal(t, http.StatusOK, unchanged.Code)
				assert.Equal(t, "upcoming", decodeDirectEliminationBody(t, unchanged.Body.Bytes())["status"])
			})
		}
	}
}

func TestDirectEliminationLifecycleEndpoints(t *testing.T) {
	t.Parallel()

	stored := seededDirectElimination(TestEventID, directelimination.DirectEliminationStatusUpcoming)
	api := newDirectEliminationTestAPI(t, stored)
	base := directEliminationsPath + "/" + stored.ID.String()
	admin := ctxAs(t, TestAdminID)
	otherEvent := map[string]any{"event_id": TestSecondEventID.String()}

	// Completing before starting is refused.
	early := api.PostCtx(admin, base+"/complete")
	require.Equal(t, http.StatusConflict, early.Code, "body: %s", early.Body)
	assert.Equal(t, "only an active direct elimination round can be completed",
		decodeDirectEliminationBody(t, early.Body.Bytes())["detail"])

	started := api.PostCtx(admin, base+"/start")
	require.Equal(t, http.StatusOK, started.Code, "body: %s", started.Body)

	startedBody := decodeDirectEliminationBody(t, started.Body.Bytes())
	assert.Equal(t, "active", startedBody["status"])
	assert.NotNil(t, startedBody["started_at"])
	assert.Nil(t, startedBody["completed_at"])

	startAgain := api.PostCtx(admin, base+"/start")
	require.Equal(t, http.StatusConflict, startAgain.Code, "body: %s", startAgain.Body)
	assert.Equal(t, "only an upcoming direct elimination round can be started",
		decodeDirectEliminationBody(t, startAgain.Body.Bytes())["detail"])

	// An active round can still be edited.
	editActive := api.PatchCtx(admin, base, otherEvent)
	require.Equal(t, http.StatusOK, editActive.Code, "body: %s", editActive.Body)

	completed := api.PostCtx(admin, base+"/complete")
	require.Equal(t, http.StatusOK, completed.Code, "body: %s", completed.Body)

	completedBody := decodeDirectEliminationBody(t, completed.Body.Bytes())
	assert.Equal(t, "ended", completedBody["status"])
	assert.NotNil(t, completedBody["started_at"])
	assert.NotNil(t, completedBody["completed_at"])

	// An ended round is immutable.
	assert.Equal(t, http.StatusConflict, api.PostCtx(admin, base+"/complete").Code)
	assert.Equal(t, http.StatusConflict, api.PostCtx(admin, base+"/start").Code)

	edit := api.PatchCtx(admin, base, otherEvent)
	require.Equal(t, http.StatusConflict, edit.Code, "body: %s", edit.Body)
	assert.Equal(t, "direct elimination round has ended and can no longer be edited",
		decodeDirectEliminationBody(t, edit.Body.Bytes())["detail"])
}

func TestDirectEliminationLifecycleUnknownAndInvalidIDs(t *testing.T) {
	t.Parallel()

	api := newDirectEliminationTestAPI(t)

	tests := []struct {
		name       string
		path       string
		wantStatus int
	}{
		{name: "start reports an unknown id as not found", path: uuid.New().String() + "/start", wantStatus: http.StatusNotFound},
		{name: "complete reports an unknown id as not found", path: uuid.New().String() + "/complete", wantStatus: http.StatusNotFound},
		{name: "start rejects an id that is not a uuid", path: "not-a-uuid/start", wantStatus: http.StatusUnprocessableEntity},
		{name: "complete rejects an id that is not a uuid", path: "not-a-uuid/complete", wantStatus: http.StatusUnprocessableEntity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			resp := api.PostCtx(ctxAs(t, TestAdminID), directEliminationsPath+"/"+tt.path)

			require.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}
