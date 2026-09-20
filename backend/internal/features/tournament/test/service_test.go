package test

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"boutline/internal/features/tournament"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seeded(name string, status tournament.TournamentStatus) tournament.Tournament {
	id := uuid.New()

	return tournament.Tournament{
		ID:         id,
		Name:       name,
		Visibility: tournament.TournamentVisibilityPrivate,
		Code:       strings.ToUpper(strings.ReplaceAll(id.String(), "-", ""))[:tournament.TournamentCodeLength],
		Status:     status,
		CreatedBy:  uuid.New(),
	}
}

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()

	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)

	return model.Status, model.Detail
}

func createInput(name string, visibility tournament.TournamentVisibility, createdBy string) *tournament.TournamentCreateInput {
	return &tournament.TournamentCreateInput{
		Body: tournament.TournamentCreateBody{
			Name:       name,
			Visibility: visibility,
			CreatedBy:  createdBy,
		},
	}
}

func ptr[T any](v T) *T { return &v }

func TestCreateTournament(t *testing.T) {
	t.Parallel()

	creator := uuid.New().String()

	tests := []struct {
		name           string
		input          *tournament.TournamentCreateInput
		wantName       string
		wantVisibility tournament.TournamentVisibility
		wantCode       int
		wantDetail     string
	}{
		{
			name:           "trims the name and defaults to private",
			input:          createInput("  spaced out  ", "", creator),
			wantName:       "spaced out",
			wantVisibility: tournament.TournamentVisibilityPrivate,
		},
		{
			name:           "keeps an explicit visibility",
			input:          createInput("open bracket", tournament.TournamentVisibilityPublic, creator),
			wantName:       "open bracket",
			wantVisibility: tournament.TournamentVisibilityPublic,
		},
		{
			name:       "rejects a name that is only whitespace",
			input:      createInput("   ", "", creator),
			wantCode:   http.StatusBadRequest,
			wantDetail: "name must not be blank",
		},
		{
			name:       "rejects an unknown visibility",
			input:      createInput("fine", tournament.TournamentVisibility("nope"), creator),
			wantCode:   http.StatusBadRequest,
			wantDetail: `unknown visibility "nope"`,
		},
		{
			name:       "rejects a created_by that is not a uuid",
			input:      createInput("fine", "", "not-a-uuid"),
			wantCode:   http.StatusBadRequest,
			wantDetail: "created_by must be a valid uuid",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repo := NewFakeTournamentRepository()
			out, err := tournament.NewTournamentService(repo).CreateTournament(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				assert.Empty(t, repo.Tournaments)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantName, out.Body.Name)
			assert.Equal(t, tt.wantVisibility, out.Body.Visibility)
			assert.Equal(t, tournament.TournamentStatusPending, out.Body.Status)
			assert.Nil(t, out.Body.CompletedAt)
			assert.Len(t, repo.Tournaments, 1)
		})
	}
}

func TestCreateTournamentGeneratesACode(t *testing.T) {
	t.Parallel()

	creator := uuid.New().String()
	service := tournament.NewTournamentService(NewFakeTournamentRepository())

	first, err := service.CreateTournament(t.Context(), createInput("one", "", creator))
	require.NoError(t, err)
	second, err := service.CreateTournament(t.Context(), createInput("two", "", creator))
	require.NoError(t, err)

	assert.Len(t, first.Body.Code, tournament.TournamentCodeLength)
	assert.Equal(t, strings.ToUpper(first.Body.Code), first.Body.Code)
	assert.NotEqual(t, first.Body.Code, second.Body.Code)

	assert.NotContains(t, first.Body.Code, "0")
	assert.NotContains(t, first.Body.Code, "O")
	assert.NotContains(t, first.Body.Code, "1")
	assert.NotContains(t, first.Body.Code, "I")
	assert.NotContains(t, first.Body.Code, "L")
}

func TestGetTournamentByID(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", tournament.TournamentStatusPending)
	service := tournament.NewTournamentService(NewFakeTournamentRepository(stored))

	t.Run("returns the stored tournament", func(t *testing.T) {
		t.Parallel()

		out, err := service.GetTournamentByID(t.Context(),
			&tournament.TournamentIDInput{ID: stored.ID.String()})

		require.NoError(t, err)
		assert.Equal(t, stored.ID.String(), out.Body.ID)
		assert.Equal(t, stored.Name, out.Body.Name)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetTournamentByID(t.Context(),
			&tournament.TournamentIDInput{ID: uuid.New().String()})

		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
		assert.Equal(t, "not found", detail)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetTournamentByID(t.Context(),
			&tournament.TournamentIDInput{ID: "not-a-uuid"})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
}

func TestGetTournamentByCodeIsCaseInsensitive(t *testing.T) {
	t.Parallel()

	stored := seeded("stored", tournament.TournamentStatusPending)
	service := tournament.NewTournamentService(NewFakeTournamentRepository(stored))

	t.Run("finds the row from a lowercase code", func(t *testing.T) {
		t.Parallel()

		out, err := service.GetTournamentByCode(t.Context(),
			&tournament.TournamentCodeInput{Code: strings.ToLower(stored.Code)})

		require.NoError(t, err)
		assert.Equal(t, stored.Code, out.Body.Code)
	})

	t.Run("trims surrounding whitespace", func(t *testing.T) {
		t.Parallel()

		out, err := service.GetTournamentByCode(t.Context(),
			&tournament.TournamentCodeInput{Code: "  " + stored.Code + "  "})

		require.NoError(t, err)
		assert.Equal(t, stored.ID.String(), out.Body.ID)
	})

	t.Run("reports an unknown code as not found", func(t *testing.T) {
		t.Parallel()

		_, err := service.GetTournamentByCode(t.Context(),
			&tournament.TournamentCodeInput{Code: "ZZZZZZ"})

		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestListTournaments(t *testing.T) {
	t.Parallel()

	mixed := []tournament.Tournament{
		seeded("a pending", tournament.TournamentStatusPending),
		seeded("b active", tournament.TournamentStatusActive),
		seeded("c pending", tournament.TournamentStatusPending),
	}

	oversized := make([]tournament.Tournament, 0, tournament.TournamentMaxPageSize+1)
	for i := range tournament.TournamentMaxPageSize + 1 {
		oversized = append(oversized,
			seeded(fmt.Sprintf("tournament %03d", i), tournament.TournamentStatusPending))
	}

	tests := []struct {
		name       string
		seed       []tournament.Tournament
		input      *tournament.TournamentListInput
		wantNames  []string
		wantCount  int
		wantTotal  int64
		wantLimit  int
		wantOffset int
		wantCode   int
	}{
		{
			name:      "defaults to the first page",
			seed:      mixed,
			input:     &tournament.TournamentListInput{},
			wantNames: []string{"a pending", "b active", "c pending"},
			wantTotal: 3,
			wantLimit: tournament.TournamentDefaultPageSize,
		},
		{
			name:      "filters by status and totals only the matches",
			seed:      mixed,
			input:     &tournament.TournamentListInput{Status: tournament.TournamentStatusActive},
			wantNames: []string{"b active"},
			wantTotal: 1,
			wantLimit: tournament.TournamentDefaultPageSize,
		},
		{
			name:       "applies limit and offset",
			seed:       mixed,
			input:      &tournament.TournamentListInput{Limit: 2, Offset: 1},
			wantNames:  []string{"b active", "c pending"},
			wantTotal:  3,
			wantLimit:  2,
			wantOffset: 1,
		},
		{
			name:      "clamps a limit above the maximum and reports the clamped value",
			seed:      oversized,
			input:     &tournament.TournamentListInput{Limit: 500},
			wantCount: tournament.TournamentMaxPageSize,
			wantTotal: int64(tournament.TournamentMaxPageSize + 1),
			wantLimit: tournament.TournamentMaxPageSize,
		},
		{
			name:      "clamps a page size of zero to the default",
			seed:      oversized,
			input:     &tournament.TournamentListInput{},
			wantCount: tournament.TournamentDefaultPageSize,
			wantTotal: int64(tournament.TournamentMaxPageSize + 1),
			wantLimit: tournament.TournamentDefaultPageSize,
		},
		{
			name:      "treats a negative offset as the first page",
			seed:      mixed,
			input:     &tournament.TournamentListInput{Offset: -5},
			wantNames: []string{"a pending", "b active", "c pending"},
			wantTotal: 3,
			wantLimit: tournament.TournamentDefaultPageSize,
		},
		{
			name:     "rejects an unknown status",
			seed:     mixed,
			input:    &tournament.TournamentListInput{Status: tournament.TournamentStatus("nope")},
			wantCode: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			out, err := tournament.NewTournamentService(NewFakeTournamentRepository(tt.seed...)).
				ListTournaments(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, _ := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Nil(t, out)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)

			if tt.wantNames != nil {
				names := make([]string, 0, len(out.Body.Data))
				for _, listed := range out.Body.Data {
					names = append(names, listed.Name)
				}
				assert.Equal(t, tt.wantNames, names)

				return
			}

			assert.Len(t, out.Body.Data, tt.wantCount)
		})
	}
}

func TestUpdateTournamentByID(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name           string
		seedStatus     tournament.TournamentStatus
		body           tournament.TournamentUpdateBody
		useUnknownID   bool
		wantName       string
		wantVisibility tournament.TournamentVisibility
		wantCode       int
		wantDetail     string
	}{
		{
			name:           "renames without touching the visibility",
			seedStatus:     tournament.TournamentStatusPending,
			body:           tournament.TournamentUpdateBody{Name: ptr("after")},
			wantName:       "after",
			wantVisibility: tournament.TournamentVisibilityPrivate,
		},
		{
			name:           "changes the visibility without touching the name",
			seedStatus:     tournament.TournamentStatusPending,
			body:           tournament.TournamentUpdateBody{Visibility: ptr(tournament.TournamentVisibilityPublic)},
			wantName:       "before",
			wantVisibility: tournament.TournamentVisibilityPublic,
		},
		{
			name:           "trims the new name",
			seedStatus:     tournament.TournamentStatusPending,
			body:           tournament.TournamentUpdateBody{Name: ptr("  padded  ")},
			wantName:       "padded",
			wantVisibility: tournament.TournamentVisibilityPrivate,
		},
		{
			name:           "still allows an edit while active",
			seedStatus:     tournament.TournamentStatusActive,
			body:           tournament.TournamentUpdateBody{Name: ptr("renamed mid-run")},
			wantName:       "renamed mid-run",
			wantVisibility: tournament.TournamentVisibilityPrivate,
		},
		{
			name:       "refuses a patch that would change nothing",
			seedStatus: tournament.TournamentStatusPending,
			body:       tournament.TournamentUpdateBody{},
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects a name that is only whitespace",
			seedStatus: tournament.TournamentStatusPending,
			body:       tournament.TournamentUpdateBody{Name: ptr("   ")},
			wantCode:   http.StatusBadRequest,
			wantDetail: "name must not be blank",
		},
		{
			name:       "rejects an unknown visibility",
			seedStatus: tournament.TournamentStatusPending,
			body:       tournament.TournamentUpdateBody{Visibility: ptr(tournament.TournamentVisibility("nope"))},
			wantCode:   http.StatusBadRequest,
			wantDetail: `unknown visibility "nope"`,
		},
		{
			name:       "refuses to edit a tournament that has ended",
			seedStatus: tournament.TournamentStatusEnd,
			body:       tournament.TournamentUpdateBody{Name: ptr("too late")},
			wantCode:   http.StatusConflict,
			wantDetail: "tournament has ended and can no longer be edited",
		},
		{
			name:         "reports an unknown id as not found",
			seedStatus:   tournament.TournamentStatusPending,
			body:         tournament.TournamentUpdateBody{Name: ptr("after")},
			useUnknownID: true,
			wantCode:     http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seeded("before", tt.seedStatus)
			repo := NewFakeTournamentRepository(stored)

			id := stored.ID.String()
			if tt.useUnknownID {
				id = uuid.New().String()
			}

			out, err := tournament.NewTournamentService(repo).UpdateTournamentByID(t.Context(),
				&tournament.TournamentUpdateInput{ID: id, Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				assert.Equal(t, "before", repo.Tournaments[stored.ID].Name)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantName, out.Body.Name)
			assert.Equal(t, tt.wantVisibility, out.Body.Visibility)

			assert.Equal(t, tt.wantName, repo.Tournaments[stored.ID].Name)
			assert.Equal(t, tt.wantVisibility, repo.Tournaments[stored.ID].Visibility)
		})
	}
}

func TestStartTournament(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		seedStatus tournament.TournamentStatus
		wantCode   int
		wantDetail string
	}{
		{name: "moves a pending tournament to active", seedStatus: tournament.TournamentStatusPending},
		{
			name:       "refuses a tournament that has already started",
			seedStatus: tournament.TournamentStatusActive,
			wantCode:   http.StatusConflict,
			wantDetail: "only a pending tournament can be started",
		},
		{
			name:       "refuses a tournament that has ended",
			seedStatus: tournament.TournamentStatusEnd,
			wantCode:   http.StatusConflict,
			wantDetail: "only a pending tournament can be started",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seeded("bracket", tt.seedStatus)
			repo := NewFakeTournamentRepository(stored)

			out, err := tournament.NewTournamentService(repo).StartTournament(t.Context(),
				&tournament.TournamentIDInput{ID: stored.ID.String()})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Equal(t, tt.seedStatus, repo.Tournaments[stored.ID].Status)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tournament.TournamentStatusActive, out.Body.Status)
			assert.Equal(t, tournament.TournamentStatusActive, repo.Tournaments[stored.ID].Status)
			assert.Nil(t, out.Body.CompletedAt)
		})
	}
}

func TestCompleteTournament(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		seedStatus tournament.TournamentStatus
		wantCode   int
		wantDetail string
	}{
		{name: "moves an active tournament to end", seedStatus: tournament.TournamentStatusActive},
		{
			name:       "refuses a tournament that has not started",
			seedStatus: tournament.TournamentStatusPending,
			wantCode:   http.StatusConflict,
			wantDetail: "only an active tournament can be completed",
		},
		{
			name:       "refuses a tournament that has already ended",
			seedStatus: tournament.TournamentStatusEnd,
			wantCode:   http.StatusConflict,
			wantDetail: "only an active tournament can be completed",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			stored := seeded("bracket", tt.seedStatus)
			repo := NewFakeTournamentRepository(stored)

			out, err := tournament.NewTournamentService(repo).CompleteTournament(t.Context(),
				&tournament.TournamentIDInput{ID: stored.ID.String()})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, repo.Tournaments[stored.ID].CompletedAt)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tournament.TournamentStatusEnd, out.Body.Status)
			require.NotNil(t, out.Body.CompletedAt)
			assert.NotNil(t, repo.Tournaments[stored.ID].CompletedAt)
		})
	}
}

func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()

	repo := NewFakeTournamentRepository()
	repo.Err = errors.New("connection refused")

	_, err := tournament.NewTournamentService(repo).
		ListTournaments(t.Context(), &tournament.TournamentListInput{})

	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}
