package test

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/competitor"
	"boutline/internal/features/user"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testEventID is the event every seeded competitor belongs to unless a test changes it.
var testEventID = uuid.MustParse("11111111-1111-1111-1111-111111111111")

func seeded(firstName, lastName string, rating competitor.Rating, team string) competitor.Competitor {
	return competitor.Competitor{
		ID:           uuid.New(),
		EventID:      testEventID,
		TournamentID: ptr(TestTournamentID),
		FirstName:    firstName,
		LastName:     lastName,
		Gender:       competitor.GenderF,
		Birthdate:    time.Date(1994, time.June, 15, 0, 0, 0, 0, time.UTC),
		Division:     "New Jersey",
		Rating:       rating,
		Team:         team,
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
			out, err := NewTestService(repo).
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
		b.PrimaryClub = "  NU Fencing "
		b.SecondaryClub = "   " // blank means "no secondary club"
		b.MemberNumber = "100123"
	})

	out, err := NewTestService(NewFakeCompetitorRepository()).
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
		_, err := NewTestService(repo).CreateCompetitor(t.Context(),
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
		_, err := NewTestService(repo).CreateCompetitor(t.Context(),
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
		service := NewTestService(repo)
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
			wantLast: []string{"Adams", "Baker", "Clark", "Davis"},
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

	t.Run("rejects an event id that is not a uuid", func(t *testing.T) {
		t.Parallel()
		_, err := NewTestService(NewFakeCompetitorRepository(seed...)).
			ListCompetitors(t.Context(), &competitor.CompetitorListInput{EventID: "not-a-uuid"})
		code, _ := apiError(t, err)
		assert.Equal(t, http.StatusBadRequest, code)
	})

	t.Run("rejects an invalid id in the ids filter", func(t *testing.T) {
		t.Parallel()
		_, err := NewTestService(NewFakeCompetitorRepository(seed...)).
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
		_, err := NewTestService(NewFakeCompetitorRepository(seed...)).
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

func TestUpdateCompetitorNewFields(t *testing.T) {
	t.Parallel()
	stored := seeded("Lee", "Kiefer", competitor.RatingB, "")
	stored.PrimaryClub = ptr("NU Fencing")
	stored.MemberNumber = ptr("100123")

	update := func(t *testing.T, seed []competitor.Competitor, body competitor.CompetitorUpdateBody) (
		*competitor.CompetitorOutput, error,
	) {
		t.Helper()
		return NewTestService(NewFakeCompetitorRepository(seed...)).UpdateCompetitorByID(
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

	const forbidden = "only the competitor's owner or the tournament's creator or admins can delete this competitor"
	const fenced = "a competitor who has fenced a bout cannot be deleted"

	owned := func(owner uuid.UUID) competitor.Competitor {
		c := seeded("Lee", "Kiefer", competitor.RatingU, "")
		c.UserID = &owner
		return c
	}
	unowned := seeded("Lee", "Kiefer", competitor.RatingU, "")
	noTournament := competitor.Competitor{
		ID: uuid.New(), FirstName: "Lee", LastName: "Kiefer", Rating: competitor.RatingU,
	}
	ownedNoTournament := noTournament
	ownedNoTournament.UserID = ptr(TestRefereeID)

	tests := []struct {
		name       string
		caller     *uuid.UUID
		stored     competitor.Competitor
		id         string
		deleteErr  error
		wantStatus int
		wantDetail string
	}{
		{name: "owner deletes their own competitor", caller: ptr(TestRefereeID), stored: owned(TestRefereeID)},
		{
			name: "tournament creator deletes an owned competitor", caller: ptr(TestCreatorID),
			stored: owned(TestRefereeID),
		},
		{name: "tournament admin deletes an unowned competitor", caller: ptr(TestAdminID), stored: unowned},
		{
			name: "owner deletes a competitor with no tournament", caller: ptr(TestRefereeID),
			stored: ownedNoTournament,
		},
		{
			name: "referee is refused", caller: ptr(TestRefereeID), stored: unowned,
			wantStatus: http.StatusForbidden, wantDetail: forbidden,
		},
		{
			name: "unrelated user is refused", caller: ptr(uuid.New()), stored: unowned,
			wantStatus: http.StatusForbidden, wantDetail: forbidden,
		},
		{
			name: "admin of another tournament is refused", caller: ptr(TestOtherAdminID), stored: unowned,
			wantStatus: http.StatusForbidden, wantDetail: forbidden,
		},
		{
			name: "unauthenticated caller is refused", stored: unowned,
			wantStatus: http.StatusForbidden, wantDetail: forbidden,
		},
		{
			name: "nobody can delete an unowned competitor with no tournament", caller: ptr(TestAdminID),
			stored: noTournament, wantStatus: http.StatusForbidden, wantDetail: forbidden,
		},
		{
			name: "reports an unknown id as not found", caller: ptr(TestAdminID), stored: unowned,
			id: uuid.New().String(), wantStatus: http.StatusNotFound, wantDetail: "not found",
		},
		{
			name: "refuses a competitor who has fenced a bout", caller: ptr(TestRefereeID),
			stored:     owned(TestRefereeID),
			deleteErr:  fmt.Errorf("delete competitor: %w", errs.ErrConflict),
			wantStatus: http.StatusConflict, wantDetail: fenced,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeCompetitorRepository(tt.stored)
			repo.DeleteErr = tt.deleteErr
			id := tt.id
			if id == "" {
				id = tt.stored.ID.String()
			}
			ctx := t.Context()
			if tt.caller != nil {
				ctx = user.WithUserID(ctx, *tt.caller)
			}

			_, err := NewTestService(repo).DeleteCompetitor(ctx, &competitor.CompetitorIDInput{ID: id})

			if tt.wantStatus == 0 {
				require.NoError(t, err)
				assert.NotContains(t, repo.Competitors, tt.stored.ID)
				return
			}
			code, detail := apiError(t, err)
			assert.Equal(t, tt.wantStatus, code)
			assert.Equal(t, tt.wantDetail, detail)
			assert.Contains(t, repo.Competitors, tt.stored.ID)
		})
	}
}

func TestCreateCompetitorRecordsOwner(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		caller    *uuid.UUID
		wantOwner *uuid.UUID
	}{
		{name: "the caller becomes the owner", caller: ptr(TestRefereeID), wantOwner: ptr(TestRefereeID)},
		{name: "no caller leaves it unowned"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			repo := NewFakeCompetitorRepository()
			ctx := t.Context()
			if tt.caller != nil {
				ctx = user.WithUserID(ctx, *tt.caller)
			}

			_, err := NewTestService(repo).CreateCompetitor(ctx, &competitor.CompetitorCreateInput{
				Body: validCreateBody(),
			})

			require.NoError(t, err)
			require.Len(t, repo.Competitors, 1)
			for _, stored := range repo.Competitors {
				assert.Equal(t, tt.wantOwner, stored.UserID)
			}
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
