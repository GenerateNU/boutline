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
	refereeID, err := parseOptionalUUID(input.Body.RefereeID, "referee_id")
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
		StartTime:        input.Body.StartTime,
		RefereeID:        refereeID,
		TimeLimitSeconds: input.Body.TimeLimitSeconds,
		PointsToWin:      input.Body.PointsToWin,
		GroupNumber:      input.Body.GroupNumber,
		Status:           BoutStatusUpcoming,
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

func parseOptionalUUID(raw *string, field string) (*uuid.UUID, error) {
	if raw == nil {
		return nil, nil
	}

	id, err := utils.ParseUUID(*raw, field)
	if err != nil {
		return nil, err
	}

	return &id, nil
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

	update, err := s.boutUpdateFrom(ctx, id, input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.UpdateBoutByID(ctx, id, update)

	return s.afterUpdate(ctx, id, err, "only an upcoming bout can be edited")
}

func (s *boutService) boutUpdateFrom(ctx context.Context, id uuid.UUID, body BoutUpdateBody) (BoutUpdate, error) {
	var update BoutUpdate
	var err error

	if update.RefereeID, err = parseOptionalUUID(body.RefereeID, "referee_id"); err != nil {
		return update, err
	}

	if update.Competitor1ID, err = parseOptionalUUID(body.Competitor1ID, "competitor_1_id"); err != nil {
		return update, err
	}
	if update.Competitor2ID, err = parseOptionalUUID(body.Competitor2ID, "competitor_2_id"); err != nil {
		return update, err
	}
	if err := s.validateCompetitorPair(ctx, id, update.Competitor1ID, update.Competitor2ID); err != nil {
		return update, err
	}

	if body.PointsToWin != nil {
		if *body.PointsToWin <= 0 {
			return update, errs.Public("points_to_win must be greater than 0", errs.ErrInvalidInput)
		}
		update.PointsToWin = body.PointsToWin
	}
	if body.TimeLimitSeconds != nil {
		if *body.TimeLimitSeconds <= 0 {
			return update, errs.Public("time_limit_seconds must be greater than 0", errs.ErrInvalidInput)
		}
		update.TimeLimitSeconds = body.TimeLimitSeconds
	}
	if body.GroupNumber != nil {
		if *body.GroupNumber < 0 {
			return update, errs.Public("group_number must not be negative", errs.ErrInvalidInput)
		}
		update.GroupNumber = body.GroupNumber
	}

	update.Location = body.Location
	update.StartTime = body.StartTime

	if update.Location == nil && update.StartTime == nil && update.RefereeID == nil &&
		update.TimeLimitSeconds == nil && update.PointsToWin == nil && update.GroupNumber == nil &&
		update.Competitor1ID == nil && update.Competitor2ID == nil {
		return update, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return update, nil
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
	if bout.RefereeID == nil {
		return nil, errs.HumaError(errs.Public(
			"a referee must be assigned before the bout can start", errs.ErrConflict))
	}

	now := time.Now().UTC()
	err = s.repo.TransitionBoutByID(ctx, id, BoutTransition{
		To:        BoutStatusActive,
		StartedAt: &now,
		From:      []BoutStatus{BoutStatusUpcoming},
	})

	return s.afterUpdate(ctx, id, err, "only an upcoming bout can be started")
}

func (s *boutService) EndBout(ctx context.Context, input *BoutIDInput) (*BoutOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	completedAt := time.Now().UTC()
	err = s.repo.TransitionBoutByID(ctx, id, BoutTransition{
		To:          BoutStatusEnd,
		CompletedAt: &completedAt,
		From:        []BoutStatus{BoutStatusActive},
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
