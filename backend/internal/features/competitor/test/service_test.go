package test

import (
	"errors"
	"net/http"
	"testing"
	"time"

	"boutline/internal/features/competitor"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testEventID is the event every seeded competitor belongs to unless a test changes it.
var testEventID = uuid.MustParse("11111111-1111-1111-1111-111111111111")

func seeded(firstName, lastName string, rating competitor.Rating, team string) competitor.Competitor {
	return competitor.Competitor{
		ID:        uuid.New(),
		EventID:   testEventID,
		FirstName: firstName,
		LastName:  lastName,
		Gender:    competitor.GenderF,
		Birthdate: time.Date(1994, time.June, 15, 0, 0, 0, 0, time.UTC),
		Division:  "New Jersey",
		Rating:    rating,
		Team:      team,
	}
}

// validCreateBody is a create body that passes every check; tests change one field at a time.
func validCreateBody() competitor.CompetitorCreateBody {
	return competitor.CompetitorCreateBody{
		EventID:   testEventID.String(),
		FirstName: "Lee",
		LastName:  "Kiefer",
		Gender:    "F",
		Birthdate: "1994-06-15",
		Division:  "New Jersey",
	}
}

func withCreate(change func(*competitor.CompetitorCreateBody)) competitor.CompetitorCreateBody {
	body := validCreateBody()
	change(&body)
	return body
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
			name: "trims names and defaults the rating to U",
			body: withCreate(func(b *competitor.CompetitorCreateBody) {
				b.FirstName, b.LastName = "  Lee  ", " Kiefer "
			}),
			wantFirst:  "Lee",
			wantRating: "U",
			wantTeam:   "",
		},
		{
			name: "keeps a rating and team that were sent",
			body: withCreate(func(b *competitor.CompetitorCreateBody) {
				b.Rating, b.Team = "A", "  NU Fencing "
			}),
			wantFirst:  "Lee",
			wantRating: "A",
			wantTeam:   "NU Fencing",
		},
		{
			name:       "rejects a first name that is only whitespace",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.FirstName = "   " }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "first name must not be blank",
		},
		{
			name:       "rejects a last name that is only whitespace",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.LastName = "   " }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "last name must not be blank",
		},
		{
			name:       "rejects a rating outside A to E and U",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.Rating = "Z" }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "rating must be one of A, B, C, D, E, or U",
		},
		{
			name:       "rejects an event id that is not a uuid",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.EventID = "not-a-uuid" }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "event id must be a valid uuid",
		},
		{
			name:       "rejects a gender outside F, M, and O",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.Gender = "X" }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "gender must be either F, M, or O",
		},
		{
			name:       "rejects a birthdate that is not YYYY-MM-DD",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.Birthdate = "06/15/1994" }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "birthdate must be a date in YYYY-MM-DD format",
		},
		{
			name:       "rejects a birthdate in the future",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.Birthdate = "2999-01-01" }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "birthdate must not be in the future",
		},
		{
			name:       "rejects a division that is only whitespace",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.Division = "   " }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "division must not be blank",
		},
		{
			name:       "rejects a rating year above 99",
			body:       withCreate(func(b *competitor.CompetitorCreateBody) { b.RatingYear = ptr(int16(100)) }),
			wantCode:   http.StatusBadRequest,
			wantDetail: "rating year must be between 0 and 99",
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

func TestCreateCompetitorStoresNewFields(t *testing.T) {
	t.Parallel()
	body := withCreate(func(b *competitor.CompetitorCreateBody) {
		b.RatingYear = ptr(int16(24))
		b.PrimaryClub = "NU Fencing"
		b.SecondaryClub = "" // empty means "no secondary club"
		b.MemberNumber = "100123"
	})

	out, err := competitor.NewCompetitorService(NewFakeCompetitorRepository()).
		CreateCompetitor(t.Context(), &competitor.CompetitorCreateInput{Body: body})
	require.NoError(t, err)

	assert.Equal(t, testEventID.String(), out.Body.EventID)
	assert.Equal(t, "F", out.Body.Gender)
	assert.Equal(t, "1994-06-15", out.Body.Birthdate)
	assert.Equal(t, "New Jersey", out.Body.Division)
	assert.Equal(t, ptr(int16(24)), out.Body.RatingYear)
	assert.Equal(t, ptr("NU Fencing"), out.Body.PrimaryClub)
	assert.Nil(t, out.Body.SecondaryClub)
	assert.Equal(t, ptr("100123"), out.Body.MemberNumber)
}

func TestCreateCompetitorMemberNumber(t *testing.T) {
	t.Parallel()
	existing := seeded("Grace", "Hopper", competitor.RatingU, "")
	existing.MemberNumber = ptr("100123")

	t.Run("rejects a duplicate member number in the same event", func(t *testing.T) {
		t.Parallel()
		repo := NewFakeCompetitorRepository(existing)
		_, err := competitor.NewCompetitorService(repo).CreateCompetitor(t.Context(),
			&competitor.CompetitorCreateInput{Body: withCreate(func(b *competitor.CompetitorCreateBody) {
				b.MemberNumber = "100123"
			})})
		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
		assert.Equal(t, competitor.DuplicateMemberNumberMessage, detail)
		assert.Len(t, repo.Competitors, 1)
	})

	t.Run("allows the same member number in a different event", func(t *testing.T) {
		t.Parallel()
		repo := NewFakeCompetitorRepository(existing)
		_, err := competitor.NewCompetitorService(repo).CreateCompetitor(t.Context(),
			&competitor.CompetitorCreateInput{Body: withCreate(func(b *competitor.CompetitorCreateBody) {
				b.EventID = uuid.New().String()
				b.MemberNumber = "100123"
			})})
		require.NoError(t, err)
		assert.Len(t, repo.Competitors, 2)
	})

	t.Run("allows several competitors without a member number", func(t *testing.T) {
		t.Parallel()
		repo := NewFakeCompetitorRepository()
		service := competitor.NewCompetitorService(repo)
		for range 2 {
			_, err := service.CreateCompetitor(t.Context(),
				&competitor.CompetitorCreateInput{Body: validCreateBody()})
			require.NoError(t, err)
		}
		assert.Len(t, repo.Competitors, 2)
	})
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
	otherEvent := seeded("D", "Davis", competitor.RatingA, "NU Fencing")
	otherEvent.EventID = uuid.New()
	seed := []competitor.Competitor{
		seeded("A", "Adams", competitor.RatingA, "NU Fencing"),
		seeded("B", "Baker", competitor.RatingA, "BU Fencing"),
		seeded("C", "Clark", competitor.RatingC, "NU Fencing"),
		otherEvent,
	}

	tests := []struct {
		name     string
		input    *competitor.CompetitorListInput
		wantLast []string
	}{
		{
			name:     "filters by event",
			input:    &competitor.CompetitorListInput{EventID: testEventID.String()},
			wantLast: []string{"Adams", "Baker", "Clark"},
		},
		{
			name:     "filters by rating",
			input:    &competitor.CompetitorListInput{EventID: testEventID.String(), Rating: "A"},
			wantLast: []string{"Adams", "Baker"},
		},
		{
			name:     "filters by team",
			input:    &competitor.CompetitorListInput{EventID: testEventID.String(), Team: "NU Fencing"},
			wantLast: []string{"Adams", "Clark"},
		},
		{
			name: "combines rating and team",
			input: &competitor.CompetitorListInput{
				EventID: testEventID.String(), Rating: "A", Team: "NU Fencing",
			},
			wantLast: []string{"Adams"},
		},
		{
			name:     "trims the team before matching",
			input:    &competitor.CompetitorListInput{EventID: testEventID.String(), Team: "  NU Fencing  "},
			wantLast: []string{"Adams", "Clark"},
		},
		{
			name:     "returns an empty page when nothing matches",
			input:    &competitor.CompetitorListInput{Rating: "E"},
			wantLast: []string{},
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

	t.Run("rejects an event id that is not a uuid", func(t *testing.T) {
		t.Parallel()
		_, err := competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).
			ListCompetitors(t.Context(), &competitor.CompetitorListInput{EventID: "not-a-uuid"})
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

func TestUpdateCompetitorNewFields(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingB, "")
	stored.PrimaryClub = ptr("NU Fencing")
	stored.MemberNumber = ptr("100123")

	update := func(t *testing.T, seed []competitor.Competitor, body competitor.CompetitorUpdateBody) (
		*competitor.CompetitorOutput, error,
	) {
		t.Helper()
		return competitor.NewCompetitorService(NewFakeCompetitorRepository(seed...)).UpdateCompetitorByID(
			t.Context(), &competitor.CompetitorUpdateInput{ID: stored.ID.String(), Body: body})
	}

	t.Run("changes gender, birthdate, and division", func(t *testing.T) {
		t.Parallel()
		out, err := update(t, []competitor.Competitor{stored}, competitor.CompetitorUpdateBody{
			Gender: ptr("M"), Birthdate: ptr("2001-02-03"), Division: ptr(" New York "),
		})
		require.NoError(t, err)
		assert.Equal(t, "M", out.Body.Gender)
		assert.Equal(t, "2001-02-03", out.Body.Birthdate)
		assert.Equal(t, "New York", out.Body.Division)
	})

	t.Run("clears the primary club when sent an empty string", func(t *testing.T) {
		t.Parallel()
		out, err := update(t, []competitor.Competitor{stored}, competitor.CompetitorUpdateBody{
			PrimaryClub: ptr(""),
		})
		require.NoError(t, err)
		assert.Nil(t, out.Body.PrimaryClub)
	})

	t.Run("sets the rating year", func(t *testing.T) {
		t.Parallel()
		out, err := update(t, []competitor.Competitor{stored}, competitor.CompetitorUpdateBody{
			RatingYear: ptr(int16(25)),
		})
		require.NoError(t, err)
		assert.Equal(t, ptr(int16(25)), out.Body.RatingYear)
	})

	t.Run("rejects an invalid gender", func(t *testing.T) {
		t.Parallel()
		_, err := update(t, []competitor.Competitor{stored}, competitor.CompetitorUpdateBody{Gender: ptr("X")})
		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "gender must be either F, M, or O", detail)
	})

	t.Run("rejects a blank division", func(t *testing.T) {
		t.Parallel()
		_, err := update(t, []competitor.Competitor{stored}, competitor.CompetitorUpdateBody{Division: ptr("  ")})
		code, detail := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
		assert.Equal(t, "division must not be blank", detail)
	})

	t.Run("rejects a member number already used in the same event", func(t *testing.T) {
		t.Parallel()
		other := seeded("Grace", "Hopper", competitor.RatingU, "")
		other.MemberNumber = ptr("200456")
		_, err := update(t, []competitor.Competitor{stored, other}, competitor.CompetitorUpdateBody{
			MemberNumber: ptr("200456"),
		})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusConflict, code)
	})

	t.Run("keeps its own member number without conflicting with itself", func(t *testing.T) {
		t.Parallel()
		out, err := update(t, []competitor.Competitor{stored}, competitor.CompetitorUpdateBody{
			MemberNumber: ptr("100123"),
		})
		require.NoError(t, err)
		assert.Equal(t, ptr("100123"), out.Body.MemberNumber)
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
