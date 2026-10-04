package test

import (
	"errors"
	"net/http"
	"testing"

	"boutline/internal/features/competitor"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seeded(firstName, lastName string, rating competitor.Rating, team string) competitor.Competitor {
	return competitor.Competitor{
		ID: uuid.New(), FirstName: firstName, LastName: lastName, Rating: rating, Team: team,
	}
}

func apiError(t *testing.T, err error) (int, string) {
	t.Helper()
	var model *huma.ErrorModel
	require.ErrorAs(t, err, &model)
	return model.Status, model.Detail
}

func ptr[T any](v T) *T { return &v }

func TestCreateCompetitor(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		body       competitor.CompetitorCreateBody
		wantFirst  string
		wantRating string
		wantTeam   string
		wantCode   int
		wantDetail string
	}{
		{
			name:       "trims names and defaults the rating to U",
			body:       competitor.CompetitorCreateBody{FirstName: "  Lee  ", LastName: " Kiefer "},
			wantFirst:  "Lee",
			wantRating: "U",
			wantTeam:   "",
		},
		{
			name: "keeps a rating and team that were sent",
			body: competitor.CompetitorCreateBody{
				FirstName: "Lee", LastName: "Kiefer", Rating: "A", Team: "  NU Fencing ",
			},
			wantFirst:  "Lee",
			wantRating: "A",
			wantTeam:   "NU Fencing",
		},
		{
			name:       "rejects a first name that is only whitespace",
			body:       competitor.CompetitorCreateBody{FirstName: "   ", LastName: "Kiefer"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "first name must not be blank",
		},
		{
			name:       "rejects a last name that is only whitespace",
			body:       competitor.CompetitorCreateBody{FirstName: "Lee", LastName: "   "},
			wantCode:   http.StatusBadRequest,
			wantDetail: "last name must not be blank",
		},
		{
			name:       "rejects a rating outside A to E and U",
			body:       competitor.CompetitorCreateBody{FirstName: "Lee", LastName: "Kiefer", Rating: "Z"},
			wantCode:   http.StatusBadRequest,
			wantDetail: "rating must be one of A, B, C, D, E, or U",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeCompetitorRepository()
			out, err := competitor.NewCompetitorService(repo).
				CreateCompetitor(t.Context(), &competitor.CompetitorCreateInput{Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				assert.Empty(t, repo.Competitors)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantFirst, out.Body.FirstName)
			assert.Equal(t, tt.wantRating, out.Body.Rating)
			assert.Equal(t, tt.wantTeam, out.Body.Team)
			assert.Len(t, repo.Competitors, 1)
		})
	}
}

func TestGetCompetitorByID(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingA, "")
	service := competitor.NewCompetitorService(NewFakeCompetitorRepository(stored))

	t.Run("returns the stored competitor", func(t *testing.T) {
		t.Parallel()
		out, err := service.GetCompetitorByID(t.Context(), &competitor.CompetitorIDInput{ID: stored.ID.String()})
		require.NoError(t, err)
		assert.Equal(t, stored.ID.String(), out.Body.ID)
		assert.Equal(t, "A", out.Body.Rating)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()
		_, err := service.GetCompetitorByID(t.Context(), &competitor.CompetitorIDInput{ID: uuid.New().String()})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})

	t.Run("rejects an id that is not a uuid", func(t *testing.T) {
		t.Parallel()
		_, err := service.GetCompetitorByID(t.Context(), &competitor.CompetitorIDInput{ID: "not-a-uuid"})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
}

func TestListCompetitors(t *testing.T) {
	t.Parallel()
	seed := []competitor.Competitor{
		seeded("A", "Adams", competitor.RatingU, ""),
		seeded("B", "Baker", competitor.RatingU, ""),
		seeded("C", "Clark", competitor.RatingU, ""),
	}

	tests := []struct {
		name       string
		input      *competitor.CompetitorListInput
		wantLast   []string
		wantLimit  int
		wantOffset int
	}{
		{
			name:      "defaults to the first page",
			input:     &competitor.CompetitorListInput{},
			wantLast:  []string{"Adams", "Baker", "Clark"},
			wantLimit: competitor.CompetitorDefaultPageSize,
		},
		{
			name:       "applies limit and offset",
			input:      &competitor.CompetitorListInput{Limit: 1, Offset: 1},
			wantLast:   []string{"Baker"},
			wantLimit:  1,
			wantOffset: 1,
		},
		{
			name:      "clamps a limit above the maximum",
			input:     &competitor.CompetitorListInput{Limit: competitor.CompetitorMaxPageSize + 50},
			wantLast:  []string{"Adams", "Baker", "Clark"},
			wantLimit: competitor.CompetitorMaxPageSize,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
				ListCompetitors(t.Context(), tt.input)
			require.NoError(t, err)
			assert.Equal(t, int64(3), out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)
			lastNames := make([]string, 0, len(out.Body.Data))
			for _, listed := range out.Body.Data {
				lastNames = append(lastNames, listed.LastName)
			}
			assert.Equal(t, tt.wantLast, lastNames)
		})
	}
}

func TestUpdateCompetitorByID(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingB, "NU Fencing")

	tests := []struct {
		name       string
		seed       []competitor.Competitor
		id         string
		body       competitor.CompetitorUpdateBody
		wantRating string
		wantTeam   string
		wantCode   int
		wantDetail string
	}{
		{
			name:       "changes the rating and leaves the team alone",
			seed:       []competitor.Competitor{stored},
			id:         stored.ID.String(),
			body:       competitor.CompetitorUpdateBody{Rating: ptr("A")},
			wantRating: "A",
			wantTeam:   "NU Fencing",
		},
		{
			name:       "clears the team when sent an empty string",
			seed:       []competitor.Competitor{stored},
			id:         stored.ID.String(),
			body:       competitor.CompetitorUpdateBody{Team: ptr("")},
			wantRating: "B",
			wantTeam:   "",
		},
		{
			name:       "refuses a patch that would change nothing",
			seed:       []competitor.Competitor{stored},
			id:         stored.ID.String(),
			wantCode:   http.StatusBadRequest,
			wantDetail: "provide at least one field to update",
		},
		{
			name:       "rejects an invalid rating",
			seed:       []competitor.Competitor{stored},
			id:         stored.ID.String(),
			body:       competitor.CompetitorUpdateBody{Rating: ptr("Z")},
			wantCode:   http.StatusBadRequest,
			wantDetail: "rating must be one of A, B, C, D, E, or U",
		},
		{
			name:     "reports an unknown id as not found",
			id:       uuid.New().String(),
			body:     competitor.CompetitorUpdateBody{Rating: ptr("A")},
			wantCode: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeCompetitorRepository(tt.seed...)
			out, err := competitor.NewCompetitorService(repo).UpdateCompetitorByID(
				t.Context(), &competitor.CompetitorUpdateInput{ID: tt.id, Body: tt.body})

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				if tt.wantDetail != "" {
					assert.Equal(t, tt.wantDetail, detail)
				}
				assert.Nil(t, out)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantRating, out.Body.Rating)
			assert.Equal(t, tt.wantTeam, out.Body.Team)
			assert.Equal(t, tt.wantTeam, repo.Competitors[stored.ID].Team)
		})
	}
}

func TestDeleteCompetitor(t *testing.T) {
	t.Parallel()

	t.Run("removes the stored competitor", func(t *testing.T) {
		t.Parallel()
		stored := seeded("Lee", "Kiefer", competitor.RatingU, "")
		repo := NewFakeCompetitorRepository(stored)
		_, err := competitor.NewCompetitorService(repo).
			DeleteCompetitor(t.Context(), &competitor.CompetitorIDInput{ID: stored.ID.String()})
		require.NoError(t, err)
		assert.Empty(t, repo.Competitors)
	})

	t.Run("reports an unknown id as not found", func(t *testing.T) {
		t.Parallel()
		_, err := competitor.NewCompetitorService(NewFakeCompetitorRepository()).
			DeleteCompetitor(t.Context(), &competitor.CompetitorIDInput{ID: uuid.New().String()})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}

func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()
	repo := NewFakeCompetitorRepository()
	repo.Err = errors.New("connection refused")

	_, err := competitor.NewCompetitorService(repo).ListCompetitors(t.Context(), &competitor.CompetitorListInput{})
	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}