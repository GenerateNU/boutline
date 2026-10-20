package test

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/competitor"

	"github.com/google/uuid"
)

var _ competitor.CompetitorRepository = (*FakeCompetitorRepository)(nil)

type FakeCompetitorRepository struct {
	Competitors map[uuid.UUID]competitor.Competitor
	Err         error // when set, every method fails with it
}

func NewFakeCompetitorRepository(seed ...competitor.Competitor) *FakeCompetitorRepository {
	competitors := make(map[uuid.UUID]competitor.Competitor, len(seed))
	for _, seeded := range seed {
		competitors[seeded.ID] = seeded
	}
	return &FakeCompetitorRepository{Competitors: competitors}
}

func (f *FakeCompetitorRepository) memberNumberTaken(eventID uuid.UUID, number *string, except uuid.UUID) bool {
	if number == nil {
		return false
	}
	for id, existing := range f.Competitors {
		if id != except && existing.EventID == eventID &&
			existing.MemberNumber != nil && *existing.MemberNumber == *number {
			return true
		}
	}
	return false
}

func duplicateMemberNumber(op string) error {
	return fmt.Errorf("%s: %w", op,
		errs.Public(competitor.DuplicateMemberNumberMessage, errs.ErrDuplicate))
}

func (f *FakeCompetitorRepository) CreateCompetitor(_ context.Context, toCreate *competitor.Competitor) error {
	if f.Err != nil {
		return f.Err
	}
	if f.memberNumberTaken(toCreate.EventID, toCreate.MemberNumber, uuid.Nil) {
		return duplicateMemberNumber("create competitor")
	}
	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Competitors[toCreate.ID] = *toCreate
	return nil
}

func (f *FakeCompetitorRepository) GetCompetitorByID(
	_ context.Context,
	id uuid.UUID,
) (*competitor.Competitor, error) {
	if f.Err != nil {
		return nil, f.Err
	}
	found, ok := f.Competitors[id]
	if !ok {
		return nil, fmt.Errorf("select competitor %s: %w", id, errs.ErrNotFound)
	}
	return &found, nil
}

func (f *FakeCompetitorRepository) ListCompetitors(
	_ context.Context,
	filter competitor.CompetitorListFilter,
) ([]competitor.Competitor, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}
	term := strings.ToLower(filter.Term)
	matched := make([]competitor.Competitor, 0, len(f.Competitors))
	for _, candidate := range f.Competitors {
		if filter.EventID != nil && candidate.EventID != *filter.EventID {
			continue
		}
		if filter.Rating != nil && candidate.Rating != *filter.Rating {
			continue
		}
		if filter.Team != nil && candidate.Team != *filter.Team {
			continue
		}
		haystack := candidate.FirstName + " " + candidate.LastName
		if !strings.Contains(strings.ToLower(haystack), term) {
			continue
		}
		matched = append(matched, candidate)
	}
	// Ordered by last name rather than created_at, so iterating a map still
	// yields the same page on every run. No tiebreaker is needed because the
	// seeded data has unique last names.
	slices.SortFunc(matched, func(a, b competitor.Competitor) int {
		return strings.Compare(a.LastName, b.LastName)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []competitor.Competitor{}, total, nil
	}
	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}
	return matched, total, nil
}

func (f *FakeCompetitorRepository) ListCompetitorTeams(
	_ context.Context,
	filter competitor.CompetitorTeamListFilter,
) ([]competitor.CompetitorTeamCount, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}
	term := strings.ToLower(filter.Term)
	counts := make(map[string]int64)
	for _, candidate := range f.Competitors {
		if filter.TournamentID != nil &&
			(candidate.TournamentID == nil || *candidate.TournamentID != *filter.TournamentID) {
			continue
		}
		if strings.Contains(strings.ToLower(candidate.Team), term) {
			counts[candidate.Team]++
		}
	}

	matched := make([]competitor.CompetitorTeamCount, 0, len(counts))
	for team, count := range counts {
		matched = append(matched, competitor.CompetitorTeamCount{Team: team, Count: count})
	}
	// Ordered by team name rather than a real word-similarity score, since
	// the fake only does substring matching -- real ranking is covered by
	// the database-backed tests in internal/tests.
	slices.SortFunc(matched, func(a, b competitor.CompetitorTeamCount) int {
		return strings.Compare(a.Team, b.Team)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []competitor.CompetitorTeamCount{}, total, nil
	}
	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}
	return matched, total, nil
}

func (f *FakeCompetitorRepository) UpdateCompetitorByID(
	_ context.Context,
	id uuid.UUID,
	update competitor.CompetitorUpdate,
) error {
	if f.Err != nil {
		return f.Err
	}
	stored, ok := f.Competitors[id]
	if !ok {
		return fmt.Errorf("update competitor %s: %w", id, errs.ErrNotFound)
	}
	if update.MemberNumber != nil &&
		f.memberNumberTaken(stored.EventID, emptyToNil(*update.MemberNumber), id) {
		return duplicateMemberNumber(fmt.Sprintf("update competitor %s", id))
	}

	if update.FirstName != nil {
		stored.FirstName = *update.FirstName
	}
	if update.LastName != nil {
		stored.LastName = *update.LastName
	}
	if update.Gender != nil {
		stored.Gender = *update.Gender
	}
	if update.Birthdate != nil {
		stored.Birthdate = *update.Birthdate
	}
	if update.Division != nil {
		stored.Division = *update.Division
	}
	if update.Rating != nil {
		stored.Rating = *update.Rating
	}
	if update.RatingYear != nil {
		stored.RatingYear = update.RatingYear
	}
	if update.PrimaryClub != nil {
		stored.PrimaryClub = emptyToNil(*update.PrimaryClub)
	}
	if update.SecondaryClub != nil {
		stored.SecondaryClub = emptyToNil(*update.SecondaryClub)
	}
	if update.MemberNumber != nil {
		stored.MemberNumber = emptyToNil(*update.MemberNumber)
	}
	if update.Team != nil {
		stored.Team = *update.Team
	}
	stored.UpdatedAt = time.Now()
	f.Competitors[id] = stored
	return nil
}

func (f *FakeCompetitorRepository) DeleteCompetitor(_ context.Context, id uuid.UUID) error {
	if f.Err != nil {
		return f.Err
	}
	if _, ok := f.Competitors[id]; !ok {
		return fmt.Errorf("delete competitor %s: %w", id, errs.ErrNotFound)
	}
	delete(f.Competitors, id)
	return nil
}

// emptyToNil mirrors real repository; stores NULL for a cleared field.
func emptyToNil(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
