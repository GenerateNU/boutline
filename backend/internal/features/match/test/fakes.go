package test

import (
	"context"
	"fmt"
	"slices"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/match"
	"boutline/internal/features/tournament"

	"github.com/google/uuid"
)

var _ match.MatchRepository = (*FakeMatchRepository)(nil)

type FakeMatchRepository struct {
	Matches map[uuid.UUID]match.Match
	Err     error // when set, every method fails with it
}

func NewFakeMatchRepository(seed ...match.Match) *FakeMatchRepository {
	matches := make(map[uuid.UUID]match.Match, len(seed))
	for _, seeded := range seed {
		matches[seeded.ID] = seeded
	}

	return &FakeMatchRepository{Matches: matches}
}

func (f *FakeMatchRepository) CreateMatch(_ context.Context, toCreate *match.Match) error {
	if f.Err != nil {
		return f.Err
	}

	toCreate.ID = uuid.New()
	toCreate.CreatedAt = time.Now()
	toCreate.UpdatedAt = toCreate.CreatedAt
	f.Matches[toCreate.ID] = *toCreate

	return nil
}

func (f *FakeMatchRepository) GetMatchByID(_ context.Context, id uuid.UUID) (*match.Match, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Matches[id]
	if !ok {
		return nil, fmt.Errorf("select match %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}

func (f *FakeMatchRepository) ListMatches(
	_ context.Context,
	filter match.MatchListFilter,
) ([]match.Match, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}

	matched := make([]match.Match, 0, len(f.Matches))
	for _, candidate := range f.Matches {
		if filter.TournamentID != nil && candidate.TournamentID != *filter.TournamentID {
			continue
		}
		if filter.Status != "" && candidate.Status != filter.Status {
			continue
		}
		matched = append(matched, candidate)
	}

	slices.SortFunc(matched, func(a, b match.Match) int {
		return b.CreatedAt.Compare(a.CreatedAt)
	})

	total := int64(len(matched))
	if filter.Offset >= len(matched) {
		return []match.Match{}, total, nil
	}

	matched = matched[filter.Offset:]
	if filter.Limit < len(matched) {
		matched = matched[:filter.Limit]
	}

	return matched, total, nil
}

func (f *FakeMatchRepository) EditMatchByID(_ context.Context, id uuid.UUID, edit match.MatchEdit) error {
	stored, err := f.guard(id, match.MatchEditableStatuses())
	if err != nil {
		return err
	}

	if edit.Location != nil {
		stored.Location = edit.Location
	}
	if edit.Time != nil {
		stored.Time = edit.Time
	}
	if edit.RefereeID != nil {
		stored.RefereeID = *edit.RefereeID
	}
	if edit.TimeLimitSeconds != nil {
		stored.TimeLimitSeconds = edit.TimeLimitSeconds
	}
	if edit.PointsToWin != nil {
		stored.PointsToWin = *edit.PointsToWin
	}
	if edit.GroupNumber != nil {
		stored.GroupNumber = *edit.GroupNumber
	}
	if edit.Competitor1ID != nil {
		stored.Competitor1ID = *edit.Competitor1ID
	}
	if edit.Competitor2ID != nil {
		stored.Competitor2ID = *edit.Competitor2ID
	}

	f.save(id, stored)

	return nil
}

func (f *FakeMatchRepository) TransitionMatchByID(
	_ context.Context,
	id uuid.UUID,
	transition match.MatchTransition,
) error {
	stored, err := f.guard(id, transition.From)
	if err != nil {
		return err
	}

	stored.Status = transition.To
	if transition.Time != nil {
		stored.Time = transition.Time
	}

	f.save(id, stored)

	return nil
}

func (f *FakeMatchRepository) DeleteMatchByID(_ context.Context, id uuid.UUID) error {
	if _, err := f.guard(id, match.MatchDeletableStatuses()); err != nil {
		return err
	}

	delete(f.Matches, id)

	return nil
}

func (f *FakeMatchRepository) guard(id uuid.UUID, allowedStatuses []match.MatchStatus) (match.Match, error) {
	if f.Err != nil {
		return match.Match{}, f.Err
	}

	stored, ok := f.Matches[id]
	if !ok {
		return match.Match{}, fmt.Errorf("update match %s: %w", id, errs.ErrNotFound)
	}

	if len(allowedStatuses) > 0 && !slices.Contains(allowedStatuses, stored.Status) {
		return match.Match{}, fmt.Errorf("update match %s: %w", id, errs.ErrConflict)
	}

	return stored, nil
}

func (f *FakeMatchRepository) save(id uuid.UUID, stored match.Match) {
	stored.UpdatedAt = time.Now()
	f.Matches[id] = stored
}

var _ match.TournamentLookup = (*FakeTournamentLookup)(nil)

type FakeTournamentLookup struct {
	Tournaments map[uuid.UUID]tournament.Tournament
	Err         error
}

func NewFakeTournamentLookup(seed ...tournament.Tournament) *FakeTournamentLookup {
	tournaments := make(map[uuid.UUID]tournament.Tournament, len(seed))
	for _, seeded := range seed {
		tournaments[seeded.ID] = seeded
	}

	return &FakeTournamentLookup{Tournaments: tournaments}
}

func (f *FakeTournamentLookup) GetTournamentByID(_ context.Context, id uuid.UUID) (*tournament.Tournament, error) {
	if f.Err != nil {
		return nil, f.Err
	}

	found, ok := f.Tournaments[id]
	if !ok {
		return nil, fmt.Errorf("select tournament %s: %w", id, errs.ErrNotFound)
	}

	return &found, nil
}
