package bout

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
	BoutMinPageSize     = 1
	BoutDefaultPageSize = 20
	BoutMaxPageSize     = 100
)

// TournamentLookup is the slice of tournament.TournamentRepository the bout
// service needs; tournament.TournamentRepository satisfies it.
type TournamentLookup interface {
	GetTournamentByID(ctx context.Context, id uuid.UUID) (*tournament.Tournament, error)
}

type BoutService interface {
	CreateBout(ctx context.Context, input *BoutCreateInput) (*BoutOutput, error)
	GetBoutByID(ctx context.Context, input *BoutIDInput) (*BoutOutput, error)
	ListBouts(ctx context.Context, input *BoutListInput) (*BoutListOutput, error)
	UpdateBoutByID(ctx context.Context, input *BoutUpdateInput) (*BoutOutput, error)
	StartBout(ctx context.Context, input *BoutIDInput) (*BoutOutput, error)
	EndBout(ctx context.Context, input *BoutIDInput) (*BoutOutput, error)
	DeleteBoutByID(ctx context.Context, input *BoutIDInput) (*struct{}, error)
}

type boutService struct {
	repo        BoutRepository
	tournaments TournamentLookup
}

func NewBoutService(repo BoutRepository, tournaments TournamentLookup) BoutService {
	return &boutService{repo: repo, tournaments: tournaments}
}

func (s *boutService) CreateBout(ctx context.Context, input *BoutCreateInput) (*BoutOutput, error) {
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

	if err := validateBoutFields(
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
			"bouts can only be created in an active tournament", errs.ErrConflict))
	}

	bout := &Bout{
		TournamentID:     tournamentID,
		Location:         input.Body.Location,
		Time:             input.Body.Time,
		RefereeID:        refereeID,
		TimeLimitSeconds: input.Body.TimeLimitSeconds,
		PointsToWin:      input.Body.PointsToWin,
		GroupNumber:      input.Body.GroupNumber,
		Status:           BoutStatusPending,
		Competitor1ID:    competitor1ID,
		Competitor2ID:    competitor2ID,
	}
	if err := s.repo.CreateBout(ctx, bout); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create bout: %w", err))
	}

	return &BoutOutput{Body: newBoutResponse(*bout)}, nil
}

func validateBoutFields(competitor1ID, competitor2ID uuid.UUID, pointsToWin int, timeLimitSeconds *int, groupNumber int) error {
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

func (s *boutService) GetBoutByID(ctx context.Context, input *BoutIDInput) (*BoutOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	bout, err := s.repo.GetBoutByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get bout: %w", err))
	}

	return &BoutOutput{Body: newBoutResponse(*bout)}, nil
}

func (s *boutService) ListBouts(ctx context.Context, input *BoutListInput) (*BoutListOutput, error) {
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
		limit = BoutDefaultPageSize
	}
	limit = utils.Clamp(limit, BoutMinPageSize, BoutMaxPageSize)
	offset := max(input.Offset, 0)

	bouts, total, err := s.repo.ListBouts(ctx, BoutListFilter{
		TournamentID: tournamentID,
		Status:       input.Status,
		Limit:        limit,
		Offset:       offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list bouts: %w", err))
	}

	data := make([]BoutResponse, 0, len(bouts))
	for _, listed := range bouts {
		data = append(data, newBoutResponse(listed))
	}

	return &BoutListOutput{Body: BoutListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *boutService) UpdateBoutByID(ctx context.Context, input *BoutUpdateInput) (*BoutOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	edit, err := s.boutEditFrom(ctx, id, input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.EditBoutByID(ctx, id, edit)

	return s.afterUpdate(ctx, id, err, "only a pending bout can be edited")
}

func (s *boutService) boutEditFrom(ctx context.Context, id uuid.UUID, body BoutUpdateBody) (BoutEdit, error) {
	var edit BoutEdit

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
func (s *boutService) validateCompetitorPair(ctx context.Context, id uuid.UUID, competitor1ID, competitor2ID *uuid.UUID) error {
	if competitor1ID != nil && competitor2ID != nil {
		if *competitor1ID == *competitor2ID {
			return errs.Public("competitor_1_id and competitor_2_id must be different", errs.ErrInvalidInput)
		}
		return nil
	}
	if competitor1ID == nil && competitor2ID == nil {
		return nil
	}

	stored, err := s.repo.GetBoutByID(ctx, id)
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

func (s *boutService) StartBout(ctx context.Context, input *BoutIDInput) (*BoutOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	bout, err := s.repo.GetBoutByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get bout: %w", err))
	}

	tourney, err := s.tournaments.GetTournamentByID(ctx, bout.TournamentID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get tournament: %w", err))
	}
	if tourney.Status != tournament.TournamentStatusActive {
		return nil, errs.HumaError(errs.Public(
			"bouts can only be started in an active tournament", errs.ErrConflict))
	}

	now := time.Now().UTC()
	err = s.repo.TransitionBoutByID(ctx, id, BoutTransition{
		To:   BoutStatusActive,
		Time: &now,
		From: []BoutStatus{BoutStatusPending},
	})

	return s.afterUpdate(ctx, id, err, "only a pending bout can be started")
}

func (s *boutService) EndBout(ctx context.Context, input *BoutIDInput) (*BoutOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.TransitionBoutByID(ctx, id, BoutTransition{
		To:   BoutStatusEnd,
		From: []BoutStatus{BoutStatusActive},
	})

	return s.afterUpdate(ctx, id, err, "only an active bout can be ended")
}

func (s *boutService) DeleteBoutByID(ctx context.Context, input *BoutIDInput) (*struct{}, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeleteBoutByID(ctx, id); err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("delete bout: %w",
				errs.Public("an active bout cannot be deleted", err)))
		}

		return nil, errs.HumaError(fmt.Errorf("delete bout: %w", err))
	}

	return nil, nil
}

func (s *boutService) afterUpdate(
	ctx context.Context,
	id uuid.UUID,
	err error,
	conflictMessage string,
) (*BoutOutput, error) {
	if err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("update bout: %w",
				errs.Public(conflictMessage, err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update bout: %w", err))
	}

	bout, err := s.repo.GetBoutByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated bout: %w", err))
	}

	return &BoutOutput{Body: newBoutResponse(*bout)}, nil
}
