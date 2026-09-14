// Package routers_test drives the registered user operation through humatest,
// so the assertions are real status codes and real JSON with no database and no
// Fiber in the way.
package routers_test

import (
	"encoding/json"
	"net/http"
	"sort"
	"testing"

	"boutline/internal/controllers"
	"boutline/internal/server/routers"
	"boutline/internal/services"
	"boutline/internal/tests/mocks"

	"github.com/danielgtaylor/huma/v2/humatest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newUserAPI(t *testing.T) humatest.TestAPI {
	t.Helper()

	_, api := humatest.New(t)
	routers.RegisterUserController(api, controllers.NewUserController(
		services.NewUserService(mocks.NewMockUserRepository()),
	))

	return api
}

func validUserBody() map[string]any {
	return map[string]any{
		"email":      "Ada@Boutline.TEST",
		"password":   "password123",
		"first_name": "Ada",
		"last_name":  "Lovelace",
	}
}

func TestCreateUserEndpoint(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		mutate     func(map[string]any)
		wantStatus int
	}{
		{
			name:       "valid body is created",
			mutate:     func(map[string]any) {},
			wantStatus: http.StatusCreated,
		},
		{
			// Passes Huma's minLength:"1" and only trims to empty in the
			// service, so this is the one body that reaches the service's
			// invalid-input path over HTTP.
			name:       "whitespace-only first name is rejected by the service",
			mutate:     func(b map[string]any) { b["first_name"] = "   " },
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing first name is rejected by the schema",
			mutate:     func(b map[string]any) { delete(b, "first_name") },
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "short password is rejected by the schema",
			mutate:     func(b map[string]any) { b["password"] = "short" },
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "malformed email is rejected by the schema",
			mutate:     func(b map[string]any) { b["email"] = "nope" },
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "missing last name is accepted",
			mutate:     func(b map[string]any) { delete(b, "last_name") },
			wantStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			body := validUserBody()
			tt.mutate(body)

			resp := newUserAPI(t).Post("/api/v1/users", body)
			assert.Equal(t, tt.wantStatus, resp.Code, "body: %s", resp.Body)
		})
	}
}

// The response is the only shape a user leaves the process in, so the password
// hash must not appear in it at any point.
func TestCreateUserEndpointNeverReturnsThePassword(t *testing.T) {
	t.Parallel()

	resp := newUserAPI(t).Post("/api/v1/users", validUserBody())
	require.Equal(t, http.StatusCreated, resp.Code, "body: %s", resp.Body)

	var body map[string]any
	require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &body))

	_, hasPassword := body["password"]
	assert.False(t, hasPassword, "password must not be serialised: %s", resp.Body)

	keys := make([]string, 0, len(body))
	for key := range body {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	assert.Equal(t,
		[]string{"created_at", "email", "first_name", "id", "last_name", "updated_at"},
		keys)
	assert.Equal(t, "ada@boutline.test", body["email"], "email is returned normalized")
	assert.Equal(t, "Lovelace", body["last_name"])
}

func TestCreateUserEndpointRejectsADuplicateEmail(t *testing.T) {
	t.Parallel()

	api := newUserAPI(t)

	first := api.Post("/api/v1/users", validUserBody())
	require.Equal(t, http.StatusCreated, first.Code, "body: %s", first.Body)

	// Same address in a different case: the unique index is over the normalized
	// form, so this has to collide.
	duplicate := validUserBody()
	duplicate["email"] = "ADA@boutline.test"

	second := api.Post("/api/v1/users", duplicate)
	assert.Equal(t, http.StatusConflict, second.Code, "body: %s", second.Body)
}

// An absent last name comes back as an explicit null rather than a missing key,
// so the response shape does not change between users.
func TestCreateUserEndpointReturnsNullForAnAbsentLastName(t *testing.T) {
	t.Parallel()

	body := validUserBody()
	delete(body, "last_name")

	resp := newUserAPI(t).Post("/api/v1/users", body)
	require.Equal(t, http.StatusCreated, resp.Code, "body: %s", resp.Body)

	var decoded map[string]any
	require.NoError(t, json.Unmarshal(resp.Body.Bytes(), &decoded))

	value, ok := decoded["last_name"]
	require.True(t, ok, "last_name key should always be present: %s", resp.Body)
	assert.Nil(t, value)
}
