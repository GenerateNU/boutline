package athlete

import (
	"context"
	"fmt"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/utils"
)

const (
	AthleteDefaultPageSize = 20
	AthleteMinPageSize     = 1
	AthleteMaxPageSize     = 100
)

type AthleteService interface {
	SearchAthletes(ctx context.Context, input *AthleteSearchInput) (*AthleteListOutput, error)
	GetAthleteByID(ctx context.Context, input *AthleteIDInput) (*AthleteOutput, error)
	ListAthleteCompetitors(ctx context.Context, input *AthleteHistoryInput) (*AthleteHistoryOutput, error)
}

type athleteService struct {
	repo AthleteRepository
}

func NewAthleteService(repo AthleteRepository) AthleteService {
	return &athleteService{repo: repo}
}

func (s *athleteService) SearchAthletes(ctx context.Context, input *AthleteSearchInput) (*AthleteListOutput, error) {
	term := strings.TrimSpace(input.Query)
	if term == "" {
		return nil, errs.HumaError(errs.Public("q must not be blank", errs.ErrInvalidInput))
	}
	limit, offset := page(input.Limit, input.Offset)

	profiles, total, err := s.repo.SearchAthleteProfiles(ctx, AthleteSearchFilter{Term: term, Limit: limit, Offset: offset})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("search athletes: %w", err))
	}

	data := make([]AthleteResponse, len(profiles))
	for i, p := range profiles {
		data[i] = newAthleteResponse(p)
	}
	return &AthleteListOutput{Body: AthleteListBody{Data: data, Total: total, Limit: limit, Offset: offset}}, nil
}

func (s *athleteService) GetAthleteByID(ctx context.Context, input *AthleteIDInput) (*AthleteOutput, error) {
	id, err := utils.ParseUUID(input.ID, "athlete id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	profile, err := s.repo.GetAthleteProfile(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get athlete: %w", err))
	}
	return &AthleteOutput{Body: newAthleteResponse(*profile)}, nil
}

func (s *athleteService) ListAthleteCompetitors(
	ctx context.Context,
	input *AthleteHistoryInput,
) (*AthleteHistoryOutput, error) {
	id, err := utils.ParseUUID(input.ID, "athlete id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	limit, offset := page(input.Limit, input.Offset)

	entries, total, err := s.repo.ListAthleteHistory(ctx, AthleteHistoryFilter{AthleteID: id, Limit: limit, Offset: offset})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list athlete competitors: %w", err))
	}

	data := make([]AthleteHistoryEntryResponse, len(entries))
	for i, e := range entries {
		data[i] = AthleteHistoryEntryResponse{
			CompetitorID:   e.CompetitorID.String(),
			TournamentID:   e.TournamentID.String(),
			TournamentName: e.TournamentName,
			EventID:        e.EventID.String(),
			Rating:         e.Rating,
			Club:           e.Club,
		}
	}
	return &AthleteHistoryOutput{Body: AthleteHistoryBody{Data: data, Total: total, Limit: limit, Offset: offset}}, nil
}

func newAthleteResponse(p AthleteProfile) AthleteResponse {
	return AthleteResponse{ID: p.ID.String(), FirstName: p.FirstName, LastName: p.LastName, Claimed: p.Claimed}
}

func page(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = AthleteDefaultPageSize
	}

	return utils.Clamp(limit, AthleteMinPageSize, AthleteMaxPageSize), max(offset, 0)
}
