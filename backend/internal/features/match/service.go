package match

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	MatchMinPageSize     = 1
	MatchDefaultPageSize = 20
	MatchMaxPageSize     = 100
)

// TournamentLookup is the slice of tournament.TournamentRepository the match
// service needs; tournament.TournamentRepository satisfies it.
type TournamentLookup interface {
	GetTournamentByID(ctx context.Context, id uuid.UUID) (*tournament.Tournament, error)
}

type MatchService interface {
	CreateMatch(ctx context.Context, input *MatchCreateInput) (*MatchOutput, error)
	GetMatchByID(ctx context.Context, input *MatchIDInput) (*MatchOutput, error)
	ListMatches(ctx context.Context, input *MatchListInput) (*MatchListOutput, error)
	UpdateMatchByID(ctx context.Context, input *MatchUpdateInput) (*MatchOutput, error)
	StartMatch(ctx context.Context, input *MatchIDInput) (*MatchOutput, error)
	EndMatch(ctx context.Context, input *MatchIDInput) (*MatchOutput, error)
	DeleteMatchByID(ctx context.Context, input *MatchIDInput) (*struct{}, error)
}

type matchService struct {
	repo        MatchRepository
	tournaments TournamentLookup
}

func NewMatchService(repo MatchRepository, tournaments TournamentLookup) MatchService {
	return &matchService{repo: repo, tournaments: tournaments}
}

func (s *matchService) CreateMatch(ctx context.Context, input *MatchCreateInput) (*MatchOutput, error) {
	tournamentID, err := utils.ParseUUID(input.Body.TournamentID, "tournament_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	refereeID, err := utils.ParseUUID(input.Body.RefereeID, "referee_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	competitor1ID, err := utils.ParseUUID(input.Body.Competitor1ID, "competitor_1_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	competitor2ID, err := utils.ParseUUID(input.Body.Competitor2ID, "competitor_2_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := validateMatchFields(
		competitor1ID, competitor2ID,
		input.Body.PointsToWin, input.Body.TimeLimitSeconds, input.Body.GroupNumber,
	); err != nil {
		return nil, errs.HumaError(err)
	}

	tourney, err := s.tournaments.GetTournamentByID(ctx, tournamentID)
	if err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return nil, errs.HumaError(errs.Public(
				"tournament_id must reference an existing tournament", errs.ErrInvalidInput))
		}
		return nil, errs.HumaError(fmt.Errorf("get tournament: %w", err))
	}
	if tourney.Status != tournament.TournamentStatusActive {
		return nil, errs.HumaError(errs.Public(
			"matches can only be created in an active tournament", errs.ErrConflict))
	}

	match := &Match{
		TournamentID:     tournamentID,
		Location:         input.Body.Location,
		Time:             input.Body.Time,
		RefereeID:        refereeID,
		TimeLimitSeconds: input.Body.TimeLimitSeconds,
		PointsToWin:      input.Body.PointsToWin,
		GroupNumber:      input.Body.GroupNumber,
		Status:           MatchStatusPending,
		Competitor1ID:    competitor1ID,
		Competitor2ID:    competitor2ID,
	}
	if err := s.repo.CreateMatch(ctx, match); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create match: %w", err))
	}

	return &MatchOutput{Body: newMatchResponse(*match)}, nil
}

func validateMatchFields(competitor1ID, competitor2ID uuid.UUID, pointsToWin int, timeLimitSeconds *int, groupNumber int) error {
	if competitor1ID == competitor2ID {
		return errs.Public("competitor_1_id and competitor_2_id must be different", errs.ErrInvalidInput)
	}
	if pointsToWin <= 0 {
		return errs.Public("points_to_win must be greater than 0", errs.ErrInvalidInput)
	}
	if timeLimitSeconds != nil && *timeLimitSeconds <= 0 {
		return errs.Public("time_limit_seconds must be greater than 0", errs.ErrInvalidInput)
	}
	if groupNumber < 0 {
		return errs.Public("group_number must not be negative", errs.ErrInvalidInput)
	}

	return nil
}

func (s *matchService) GetMatchByID(ctx context.Context, input *MatchIDInput) (*MatchOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	match, err := s.repo.GetMatchByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get match: %w", err))
	}

	return &MatchOutput{Body: newMatchResponse(*match)}, nil
}

func (s *matchService) ListMatches(ctx context.Context, input *MatchListInput) (*MatchListOutput, error) {
	if input.Status != "" && !input.Status.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
	}

	var tournamentID *uuid.UUID
	if input.TournamentID != "" {
		id, err := utils.ParseUUID(input.TournamentID, "tournament_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		tournamentID = &id
	}

	limit := input.Limit
	if limit <= 0 {
		limit = MatchDefaultPageSize
	}
	limit = utils.Clamp(limit, MatchMinPageSize, MatchMaxPageSize)
	offset := max(input.Offset, 0)

	matches, total, err := s.repo.ListMatches(ctx, MatchListFilter{
		TournamentID: tournamentID,
		Status:       input.Status,
		Limit:        limit,
		Offset:       offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list matches: %w", err))
	}

	data := make([]MatchResponse, 0, len(matches))
	for _, listed := range matches {
		data = append(data, newMatchResponse(listed))
	}

	return &MatchListOutput{Body: MatchListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *matchService) UpdateMatchByID(ctx context.Context, input *MatchUpdateInput) (*MatchOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	edit, err := s.matchEditFrom(ctx, id, input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.EditMatchByID(ctx, id, edit)

	return s.afterUpdate(ctx, id, err, "only a pending match can be edited")
}

func (s *matchService) matchEditFrom(ctx context.Context, id uuid.UUID, body MatchUpdateBody) (MatchEdit, error) {
	var edit MatchEdit

	if body.RefereeID != nil {
		refereeID, err := utils.ParseUUID(*body.RefereeID, "referee_id")
		if err != nil {
			return edit, err
		}
		edit.RefereeID = &refereeID
	}

	if body.Competitor1ID != nil {
		competitor1ID, err := utils.ParseUUID(*body.Competitor1ID, "competitor_1_id")
		if err != nil {
			return edit, err
		}
		edit.Competitor1ID = &competitor1ID
	}
	if body.Competitor2ID != nil {
		competitor2ID, err := utils.ParseUUID(*body.Competitor2ID, "competitor_2_id")
		if err != nil {
			return edit, err
		}
		edit.Competitor2ID = &competitor2ID
	}
	if err := s.validateCompetitorPair(ctx, id, edit.Competitor1ID, edit.Competitor2ID); err != nil {
		return edit, err
	}

	if body.PointsToWin != nil {
		if *body.PointsToWin <= 0 {
			return edit, errs.Public("points_to_win must be greater than 0", errs.ErrInvalidInput)
		}
		edit.PointsToWin = body.PointsToWin
	}
	if body.TimeLimitSeconds != nil {
		if *body.TimeLimitSeconds <= 0 {
			return edit, errs.Public("time_limit_seconds must be greater than 0", errs.ErrInvalidInput)
		}
		edit.TimeLimitSeconds = body.TimeLimitSeconds
	}
	if body.GroupNumber != nil {
		if *body.GroupNumber < 0 {
			return edit, errs.Public("group_number must not be negative", errs.ErrInvalidInput)
		}
		edit.GroupNumber = body.GroupNumber
	}

	edit.Location = body.Location
	edit.Time = body.Time

	if edit.Location == nil && edit.Time == nil && edit.RefereeID == nil &&
		edit.TimeLimitSeconds == nil && edit.PointsToWin == nil && edit.GroupNumber == nil &&
		edit.Competitor1ID == nil && edit.Competitor2ID == nil {
		return edit, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return edit, nil
}

// When only one competitor is supplied, the other side of the pair comes from
// the stored row, so the distinctness check needs a read the plain field
// validation above cannot see.
func (s *matchService) validateCompetitorPair(ctx context.Context, id uuid.UUID, competitor1ID, competitor2ID *uuid.UUID) error {
	if competitor1ID != nil && competitor2ID != nil {
		if *competitor1ID == *competitor2ID {
			return errs.Public("competitor_1_id and competitor_2_id must be different", errs.ErrInvalidInput)
		}
		return nil
	}
	if competitor1ID == nil && competitor2ID == nil {
		return nil
	}

	stored, err := s.repo.GetMatchByID(ctx, id)
	if err != nil {
		return err
	}

	other := stored.Competitor2ID
	changed := competitor1ID
	if competitor2ID != nil {
		other = stored.Competitor1ID
		changed = competitor2ID
	}
	if *changed == other {
		return errs.Public("competitor_1_id and competitor_2_id must be different", errs.ErrInvalidInput)
	}

	return nil
}

func (s *matchService) StartMatch(ctx context.Context, input *MatchIDInput) (*MatchOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	match, err := s.repo.GetMatchByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get match: %w", err))
	}

	tourney, err := s.tournaments.GetTournamentByID(ctx, match.TournamentID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get tournament: %w", err))
	}
	if tourney.Status != tournament.TournamentStatusActive {
		return nil, errs.HumaError(errs.Public(
			"matches can only be started in an active tournament", errs.ErrConflict))
	}

	now := time.Now().UTC()
	err = s.repo.TransitionMatchByID(ctx, id, MatchTransition{
		To:   MatchStatusActive,
		Time: &now,
		From: []MatchStatus{MatchStatusPending},
	})

	return s.afterUpdate(ctx, id, err, "only a pending match can be started")
}

func (s *matchService) EndMatch(ctx context.Context, input *MatchIDInput) (*MatchOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.TransitionMatchByID(ctx, id, MatchTransition{
		To:   MatchStatusEnd,
		From: []MatchStatus{MatchStatusActive},
	})

	return s.afterUpdate(ctx, id, err, "only an active match can be ended")
}

func (s *matchService) DeleteMatchByID(ctx context.Context, input *MatchIDInput) (*struct{}, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeleteMatchByID(ctx, id); err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("delete match: %w",
				errs.Public("an active match cannot be deleted", err)))
		}

		return nil, errs.HumaError(fmt.Errorf("delete match: %w", err))
	}

	return nil, nil
}

func (s *matchService) afterUpdate(
	ctx context.Context,
	id uuid.UUID,
	err error,
	conflictMessage string,
) (*MatchOutput, error) {
	if err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("update match: %w",
				errs.Public(conflictMessage, err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update match: %w", err))
	}

	match, err := s.repo.GetMatchByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated match: %w", err))
	}

	return &MatchOutput{Body: newMatchResponse(*match)}, nil
}
