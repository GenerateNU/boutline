package test

import (
	"errors"
	"net/http"
	"strings"
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

func TestListCompetitorsFilters(t *testing.T) {
	t.Parallel()
	seed := []competitor.Competitor{
		seeded("A", "Adams", competitor.RatingA, "NU Fencing"),
		seeded("B", "Baker", competitor.RatingA, "BU Fencing"),
		seeded("C", "Clark", competitor.RatingC, "NU Fencing"),
	}

	tests := []struct {
		name     string
		input    *competitor.CompetitorListInput
		wantLast []string
	}{
		{
			name:     "filters by rating",
			input:    &competitor.CompetitorListInput{Rating: "A"},
			wantLast: []string{"Adams", "Baker"},
		},
		{
			name:     "filters by team",
			input:    &competitor.CompetitorListInput{Team: "NU Fencing"},
			wantLast: []string{"Adams", "Clark"},
		},
		{
			name:     "combines rating and team",
			input:    &competitor.CompetitorListInput{Rating: "A", Team: "NU Fencing"},
			wantLast: []string{"Adams"},
		},
		{
			name:     "trims the team before matching",
			input:    &competitor.CompetitorListInput{Team: "  NU Fencing  "},
			wantLast: []string{"Adams", "Clark"},
		},
		{
			name:     "returns an empty page when nothing matches",
			input:    &competitor.CompetitorListInput{Rating: "E"},
			wantLast: []string{},
		},
		{
			name:     "filters by ids",
			input:    &competitor.CompetitorListInput{IDs: seed[0].ID.String() + "," + seed[2].ID.String()},
			wantLast: []string{"Adams", "Clark"},
		},
		{
			name:     "combines ids and rating",
			input:    &competitor.CompetitorListInput{IDs: seed[0].ID.String() + "," + seed[2].ID.String(), Rating: "A"},
			wantLast: []string{"Adams"},
		},
		{
			name:     "an empty ids string returns everything",
			input:    &competitor.CompetitorListInput{IDs: ""},
			wantLast: []string{"Adams", "Baker", "Clark"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
				ListCompetitors(t.Context(), tt.input)
			require.NoError(t, err)

			// total counts only the matches, not every competitor
			assert.Equal(t, int64(len(tt.wantLast)), out.Body.Total)
			lastNames := make([]string, 0, len(out.Body.Data))
			for _, listed := range out.Body.Data {
				lastNames = append(lastNames, listed.LastName)
			}
			assert.Equal(t, tt.wantLast, lastNames)
		})
	}

	t.Run("rejects an invalid rating", func(t *testing.T) {
		t.Parallel()
		_, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
			ListCompetitors(t.Context(), &competitor.CompetitorListInput{Rating: "Z"})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})

	t.Run("rejects an invalid id in the ids filter", func(t *testing.T) {
		t.Parallel()
		_, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
			ListCompetitors(t.Context(), &competitor.CompetitorListInput{IDs: "not-a-uuid"})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})

	t.Run("rejects more ids than the limit", func(t *testing.T) {
		t.Parallel()
		ids := make([]string, competitor.CompetitorMaxIDs+1)
		for i := range ids {
			ids[i] = uuid.New().String()
		}
		_, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
			ListCompetitors(t.Context(), &competitor.CompetitorListInput{IDs: strings.Join(ids, ",")})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
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

func TestListCompetitorsWithQuery(t *testing.T) {
	t.Parallel()
	seed := []competitor.Competitor{
		seeded("Lee", "Kiefer", competitor.RatingA, "NU Fencing"),
		seeded("Race", "Imboden", competitor.RatingA, "St. John's Fencing"),
	}

	tests := []struct {
		name       string
		input      *competitor.CompetitorListInput
		wantLast   []string
		wantTotal  int64
		wantLimit  int
		wantOffset int
	}{
		{
			name:      "matches by name",
			input:     &competitor.CompetitorListInput{Query: "kiefer"},
			wantLast:  []string{"Kiefer"},
			wantTotal: 1,
			wantLimit: competitor.CompetitorDefaultPageSize,
		},
		{
			name:      "a blank term matches everyone",
			input:     &competitor.CompetitorListInput{Query: "   "},
			wantLast:  []string{"Imboden", "Kiefer"},
			wantTotal: 2,
			wantLimit: competitor.CompetitorDefaultPageSize,
		},
		{
			name:       "applies limit and offset",
			input:      &competitor.CompetitorListInput{Query: "e", Limit: 1, Offset: 1},
			wantLast:   []string{"Kiefer"},
			wantTotal:  2,
			wantLimit:  1,
			wantOffset: 1,
		},
		{
			name:      "clamps a limit above the maximum",
			input:     &competitor.CompetitorListInput{Query: "e", Limit: competitor.CompetitorMaxPageSize + 50},
			wantLast:  []string{"Imboden", "Kiefer"},
			wantTotal: 2,
			wantLimit: competitor.CompetitorMaxPageSize,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
				ListCompetitors(t.Context(), tt.input)
			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
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

func TestListCompetitorTeams(t *testing.T) {
	t.Parallel()
	seed := []competitor.Competitor{
		seeded("Lee", "Kiefer", competitor.RatingA, "NU Fencing"),
		seeded("Jon", "Doe", competitor.RatingA, "NU Fencing"),
		seeded("Race", "Imboden", competitor.RatingA, "St. John's Fencing"),
	}

	tests := []struct {
		name       string
		input      *competitor.CompetitorTeamListInput
		wantTeams  []string
		wantCounts []int64
		wantTotal  int64
		wantLimit  int
		wantOffset int
		wantCode   int
		wantDetail string
	}{
		{
			name:       "matches a team and counts its competitors",
			input:      &competitor.CompetitorTeamListInput{Query: "john"},
			wantTeams:  []string{"St. John's Fencing"},
			wantCounts: []int64{1},
			wantTotal:  1,
			wantLimit:  competitor.CompetitorDefaultPageSize,
		},
		{
			name:       "collapses to one row per team regardless of roster size",
			input:      &competitor.CompetitorTeamListInput{Query: "fencing"},
			wantTeams:  []string{"NU Fencing", "St. John's Fencing"},
			wantCounts: []int64{2, 1},
			wantTotal:  2,
			wantLimit:  competitor.CompetitorDefaultPageSize,
		},
		{
			name:       "a blank term lists every team",
			input:      &competitor.CompetitorTeamListInput{Query: "   "},
			wantTeams:  []string{"NU Fencing", "St. John's Fencing"},
			wantCounts: []int64{2, 1},
			wantTotal:  2,
			wantLimit:  competitor.CompetitorDefaultPageSize,
		},
		{
			name:       "applies limit and offset",
			input:      &competitor.CompetitorTeamListInput{Query: "fencing", Limit: 1, Offset: 1},
			wantTeams:  []string{"St. John's Fencing"},
			wantCounts: []int64{1},
			wantTotal:  2,
			wantLimit:  1,
			wantOffset: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
				ListCompetitorTeams(t.Context(), tt.input)

			if tt.wantCode != 0 {
				code, detail := apiError(t, err)
				assert.Equal(t, tt.wantCode, code)
				assert.Equal(t, tt.wantDetail, detail)
				assert.Nil(t, out)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
			assert.Equal(t, tt.wantLimit, out.Body.Limit)
			assert.Equal(t, tt.wantOffset, out.Body.Offset)

			teams := make([]string, 0, len(out.Body.Data))
			counts := make([]int64, 0, len(out.Body.Data))
			for _, listed := range out.Body.Data {
				teams = append(teams, listed.Team)
				counts = append(counts, listed.CompetitorCount)
			}
			assert.Equal(t, tt.wantTeams, teams)
			assert.Equal(t, tt.wantCounts, counts)
		})
	}
}

func TestListCompetitorTeamsByTournament(t *testing.T) {
	t.Parallel()
	tournamentA := uuid.New()
	tournamentB := uuid.New()
	inTournament := func(id uuid.UUID, firstName, lastName, team string) competitor.Competitor {
		c := seeded(firstName, lastName, competitor.RatingA, team)
		c.TournamentID = &id
		return c
	}
	seed := []competitor.Competitor{
		inTournament(tournamentA, "Lee", "Kiefer", "NU Fencing"),
		inTournament(tournamentA, "Jon", "Doe", "NU Fencing"),
		inTournament(tournamentB, "Race", "Imboden", "NU Fencing"),
		seeded("No", "Tournament", competitor.RatingA, "NU Fencing"),
	}

	repo := NewFakeCompetitorRepository(seed...)

	t.Run("scopes the roster count to the given tournament", func(t *testing.T) {
		t.Parallel()
		out, err := competitor.NewCompetitorService(repo).ListCompetitorTeams(t.Context(),
			&competitor.CompetitorTeamListInput{Query: "fencing", TournamentID: tournamentA.String()})
		require.NoError(t, err)
		require.Len(t, out.Body.Data, 1)
		assert.Equal(t, "NU Fencing", out.Body.Data[0].Team)
		assert.Equal(t, int64(2), out.Body.Data[0].CompetitorCount)
	})

	t.Run("rejects a tournament id that is not a uuid", func(t *testing.T) {
		t.Parallel()
		_, err := competitor.NewCompetitorService(repo).ListCompetitorTeams(t.Context(),
			&competitor.CompetitorTeamListInput{Query: "fencing", TournamentID: "not-a-uuid"})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})
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
