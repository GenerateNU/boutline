package test

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"boutline/internal/errs"
	"boutline/internal/features/competitor"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seeded(firstName, lastName string, rating competitor.Rating, team string) competitor.Competitor {
	return competitor.Competitor{
		ID: uuid.New(), TournamentID: ptr(TestTournamentID),
		FirstName: firstName, LastName: lastName, Rating: rating, Team: team,
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
		{
			name: "rejects a tournament id that is not a uuid",
			body: competitor.CompetitorCreateBody{
				TournamentID: "not-a-uuid", FirstName: "Lee", LastName: "Kiefer",
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "tournamentId must be a valid uuid",
		},
		{
			name: "rejects a tournament that does not exist",
			body: competitor.CompetitorCreateBody{
				TournamentID: uuid.New().String(), FirstName: "Lee", LastName: "Kiefer",
			},
			wantCode:   http.StatusBadRequest,
			wantDetail: "tournamentId must reference an existing tournament",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeCompetitorRepository()
			body := tt.body
			if body.TournamentID == "" {
				body.TournamentID = TestTournamentID.String()
			}
			out, err := NewTestService(repo).
				CreateCompetitor(t.Context(), &competitor.CompetitorCreateInput{Body: body})

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
	service := NewTestService(NewFakeCompetitorRepository(stored))

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
			out, err := NewTestService(NewFakeCompetitorRepository(seed...)).
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
			name:     "matches the name case-insensitively",
			input:    &competitor.CompetitorListInput{Query: "adam"},
			wantLast: []string{"Adams"},
		},
		{
			name:     "matches across the first and last name boundary",
			input:    &competitor.CompetitorListInput{Query: "a Ada"},
			wantLast: []string{"Adams"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			out, err := NewTestService(NewFakeCompetitorRepository(seed...)).
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
		_, err := NewTestService(NewFakeCompetitorRepository(seed...)).
			ListCompetitors(t.Context(), &competitor.CompetitorListInput{Rating: "Z"})
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
			out, err := NewTestService(repo).UpdateCompetitorByID(
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
			out, err := NewTestService(NewFakeCompetitorRepository(seed...)).
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

func TestDeleteCompetitor(t *testing.T) {
	t.Parallel()

	t.Run("removes the stored competitor", func(t *testing.T) {
		t.Parallel()
		stored := seeded("Lee", "Kiefer", competitor.RatingU, "")
		repo := NewFakeCompetitorRepository(stored)
		_, err := NewTestService(repo).
			DeleteCompetitor(t.Context(), &competitor.CompetitorIDInput{ID: stored.ID.String()})
		require.NoError(t, err)
		assert.Empty(t, repo.Competitors)
	})

	tests := []struct {
		name       string
		repoErr    error
		wantStatus int
		wantDetail string
	}{
		{name: "reports an unknown id as not found", wantStatus: http.StatusNotFound, wantDetail: "not found"},
		{
			name:       "refuses a competitor who has fenced a bout",
			repoErr:    fmt.Errorf("delete competitor: %w", errs.ErrConflict),
			wantStatus: http.StatusConflict,
			wantDetail: "a competitor who has fenced a bout cannot be deleted",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeCompetitorRepository()
			repo.Err = tt.repoErr
			_, err := NewTestService(repo).
				DeleteCompetitor(t.Context(), &competitor.CompetitorIDInput{ID: uuid.New().String()})
			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantStatus, code)
			assert.Equal(t, tt.wantDetail, detail)
		})
	}
}

func TestRepositoryFailureIsNotAClientError(t *testing.T) {
	t.Parallel()
	repo := NewFakeCompetitorRepository()
	repo.Err = errors.New("connection refused")

	_, err := NewTestService(repo).ListCompetitors(t.Context(), &competitor.CompetitorListInput{})
	code, detail := apiError(t, err)
	assert.Equal(t, http.StatusInternalServerError, code)
	assert.Equal(t, "internal server error", detail)
}

func TestListCompetitorsByTournament(t *testing.T) {
	t.Parallel()
	other := uuid.New()
	entered := seeded("A", "Adams", competitor.RatingU, "NU Fencing")
	elsewhere := seeded("B", "Baker", competitor.RatingU, "BU Fencing")
	elsewhere.TournamentID = &other
	service := NewTestService(NewFakeCompetitorRepository(entered, elsewhere))

	t.Run("returns only the tournament's competitors", func(t *testing.T) {
		t.Parallel()
		out, err := service.ListCompetitors(t.Context(), &competitor.CompetitorListInput{
			TournamentID: TestTournamentID.String(),
		})
		require.NoError(t, err)
		require.Len(t, out.Body.Data, 1)
		assert.Equal(t, "Adams", out.Body.Data[0].LastName)
		assert.Equal(t, TestTournamentID.String(), out.Body.Data[0].TournamentID)
		assert.Equal(t, int64(1), out.Body.Total)
	})

	t.Run("rejects a tournament id that is not a uuid", func(t *testing.T) {
		t.Parallel()
		_, err := service.ListCompetitors(t.Context(), &competitor.CompetitorListInput{
			TournamentID: "not-a-uuid",
		})
		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "tournament_id must be a valid uuid", detail)
	})
}

func TestListTeamsByTournament(t *testing.T) {
	t.Parallel()
	other := uuid.New()
	elsewhere := seeded("E", "Evans", competitor.RatingU, "Elsewhere FC")
	elsewhere.TournamentID = &other
	seed := []competitor.Competitor{
		seeded("A", "Adams", competitor.RatingU, "NU Fencing"),
		seeded("B", "Baker", competitor.RatingU, "BU Fencing"),
		seeded("C", "Clark", competitor.RatingU, "NU Fencing"),
		seeded("D", "Diaz", competitor.RatingU, ""),
		elsewhere,
	}
	service := NewTestService(NewFakeCompetitorRepository(seed...))

	tests := []struct {
		name      string
		input     competitor.TeamListInput
		want      []competitor.TeamResponse
		wantTotal int64
	}{
		{
			name:  "dedupes teams and counts their competitors",
			input: competitor.TeamListInput{},
			want: []competitor.TeamResponse{
				{Name: "BU Fencing", CompetitorCount: 1},
				{Name: "NU Fencing", CompetitorCount: 2},
			},
			wantTotal: 2,
		},
		{
			name:      "filters by club name",
			input:     competitor.TeamListInput{Query: "nu "},
			want:      []competitor.TeamResponse{{Name: "NU Fencing", CompetitorCount: 2}},
			wantTotal: 1,
		},
		{
			name:      "paginates",
			input:     competitor.TeamListInput{Limit: 1, Offset: 1},
			want:      []competitor.TeamResponse{{Name: "NU Fencing", CompetitorCount: 2}},
			wantTotal: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			input := tt.input
			input.TournamentID = TestTournamentID.String()
			out, err := service.ListTeamsByTournament(t.Context(), &input)
			require.NoError(t, err)
			assert.Equal(t, tt.want, out.Body.Data)
			assert.Equal(t, tt.wantTotal, out.Body.Total)
		})
	}

	t.Run("404s for a tournament that does not exist", func(t *testing.T) {
		t.Parallel()
		_, err := service.ListTeamsByTournament(t.Context(), &competitor.TeamListInput{
			TournamentID: uuid.New().String(),
		})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusNotFound, code)
	})
}
