package test

import (
	"context"
	"fmt"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/features/athlete"

	"github.com/google/uuid"
)

var (
	MayaID  = uuid.MustParse("aa000000-0000-4000-8000-000000000001")
	KenjiID = uuid.MustParse("aa000000-0000-4000-8000-000000000002")
)

var _ athlete.AthleteRepository = (*FakeAthleteRepository)(nil)

type FakeAthleteRepository struct {
	Profiles []athlete.AthleteProfile
	History  map[uuid.UUID][]athlete.AthleteHistoryEntry
	Err      error // when set, every method fails with it
}

func (f *FakeAthleteRepository) UpsertAthleteByMemberNumber(_ context.Context, _ string) (uuid.UUID, error) {
	return uuid.Nil, f.Err
}

func (f *FakeAthleteRepository) GetAthleteProfile(_ context.Context, id uuid.UUID) (*athlete.AthleteProfile, error) {
	if f.Err != nil {
		return nil, f.Err
	}
	for _, p := range f.Profiles {
		if p.ID == id {
			return &p, nil
		}
	}
	return nil, fmt.Errorf("select athlete %s: %w", id, errs.ErrNotFound)
}

func (f *FakeAthleteRepository) ListAthleteHistory(
	_ context.Context,
	filter athlete.AthleteHistoryFilter,
) ([]athlete.AthleteHistoryEntry, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}
	all := f.History[filter.AthleteID]
	return paginate(all, filter.Limit, filter.Offset), int64(len(all)), nil
}

func (f *FakeAthleteRepository) SearchAthleteProfiles(
	_ context.Context,
	filter athlete.AthleteSearchFilter,
) ([]athlete.AthleteProfile, int64, error) {
	if f.Err != nil {
		return nil, 0, f.Err
	}
	var matches []athlete.AthleteProfile
	for _, p := range f.Profiles {
		if strings.Contains(strings.ToLower(p.FirstName+" "+p.LastName), strings.ToLower(filter.Term)) {
			matches = append(matches, p)
		}
	}
	return paginate(matches, filter.Limit, filter.Offset), int64(len(matches)), nil
}

func paginate[T any](all []T, limit, offset int) []T {
	if offset >= len(all) {
		return nil
	}
	return all[offset:min(offset+limit, len(all))]
}

func NewFakeAthleteRepository() *FakeAthleteRepository {
	club := "Salle Rouge"
	return &FakeAthleteRepository{
		Profiles: []athlete.AthleteProfile{
			{ID: MayaID, FirstName: "Maya", LastName: "Chen", Claimed: true},
			{ID: KenjiID, FirstName: "Kenji", LastName: "Tanaka"},
		},
		History: map[uuid.UUID][]athlete.AthleteHistoryEntry{
			MayaID: {{
				CompetitorID: uuid.New(), TournamentID: uuid.New(), TournamentName: "Spring Open",
				EventID: uuid.New(), Rating: "B", Club: &club,
			}},
		},
	}
}
