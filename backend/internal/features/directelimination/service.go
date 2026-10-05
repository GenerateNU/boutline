package directelimination

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

type DirectEliminationService interface {
	CreateDirectElimination(ctx context.Context, input *DirectEliminationCreateInput) (*DirectEliminationOutput, error)
	GetDirectEliminationByID(ctx context.Context, input *DirectEliminationIDInput) (*DirectEliminationOutput, error)
	ListDirectElimination(ctx context.Context, input *DirectEliminationListInput) (*DirectEliminationListOutput, error)
	UpdateDirectEliminationByID(ctx context.Context, input *DirectEliminationUpdateInput) (*DirectEliminationOutput, error)
	DeleteDirectEliminationByID(ctx context.Context, input *DirectEliminationIDInput) (*struct{}, error)
	StartDirectElimination(ctx context.Context, input *DirectEliminationIDInput) (*DirectEliminationOutput, error)
	CompleteDirectElimination(ctx context.Context, input *DirectEliminationIDInput) (*DirectEliminationOutput, error)
}

type directEliminationService struct {
	repo DirectEliminationRepository
}

func NewDirectEliminationService(repo DirectEliminationRepository) DirectEliminationService {
	return &directEliminationService{repo: repo}
}

func (s *directEliminationService) CreateDirectElimination(
	ctx context.Context,
	input *DirectEliminationCreateInput,
) (*DirectEliminationOutput, error) {
	eventID, err := utils.ParseUUID(input.Body.EventID, "event_id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	de := &DirectElimination{
		EventID: eventID,
		Status:  StatusUpcoming,
	}

	if err := s.repo.CreateDirectElimination(ctx, de); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create direct elimination: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}

func (s *directEliminationService) GetDirectEliminationByID(
	ctx context.Context,
	input *DirectEliminationIDInput,
) (*DirectEliminationOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	de, err := s.repo.GetDirectEliminationByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get direct elimination: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}

func (s *directEliminationService) ListDirectElimination(
	ctx context.Context,
	input *DirectEliminationListInput,
) (*DirectEliminationListOutput, error) {
	filter := DirectEliminationListFilter{}

	if input.EventID != "" {
		eventID, err := utils.ParseUUID(input.EventID, "event_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		filter.EventID = &eventID
	}

	if input.Status != "" {
		if !input.Status.IsValid() {
			return nil, errs.HumaError(errs.Public(
				fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
		}
		status := input.Status
		filter.Status = &status
	}

	rounds, err := s.repo.ListDirectElimination(ctx, filter)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list direct elimination: %w", err))
	}

	data := make([]DirectEliminationResponse, 0, len(rounds))
	for _, listed := range rounds {
		data = append(data, newDirectEliminationResponse(listed))
	}

	return &DirectEliminationListOutput{Body: DirectEliminationListBody{
		Data:  data,
		Total: int64(len(data)),
	}}, nil
}

func (s *directEliminationService) UpdateDirectEliminationByID(
	ctx context.Context,
	input *DirectEliminationUpdateInput,
) (*DirectEliminationOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	edit, err := directEliminationEditFrom(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.EditDirectEliminationByID(ctx, id, edit)

	return s.afterUpdate(ctx, id, err, "direct elimination round has ended and can no longer be edited")
}

func directEliminationEditFrom(body DirectEliminationUpdateBody) (DirectEliminationEdit, error) {
	var edit DirectEliminationEdit

	if body.EventID != nil {
		eventID, err := utils.ParseUUID(*body.EventID, "event_id")
		if err != nil {
			return edit, err
		}
		edit.EventID = &eventID
	}

	if edit.EventID == nil {
		return edit, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return edit, nil
}

func (s *directEliminationService) DeleteDirectEliminationByID(
	ctx context.Context,
	input *DirectEliminationIDInput,
) (*struct{}, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeleteDirectElimination(ctx, id); err != nil {
		return nil, errs.HumaError(fmt.Errorf("delete direct elimination: %w", err))
	}

	return nil, nil
}

func (s *directEliminationService) StartDirectElimination(
	ctx context.Context,
	input *DirectEliminationIDInput,
) (*DirectEliminationOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	startedAt := time.Now().UTC()

	err = s.repo.TransitionDirectEliminationByID(ctx, id, DirectEliminationTransition{
		To:        StatusActive,
		StartedAt: &startedAt,
		From:      []Status{StatusUpcoming},
	})

	return s.afterUpdate(ctx, id, err, "only an upcoming direct elimination round can be started")
}

func (s *directEliminationService) CompleteDirectElimination(
	ctx context.Context,
	input *DirectEliminationIDInput,
) (*DirectEliminationOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	completedAt := time.Now().UTC()

	err = s.repo.TransitionDirectEliminationByID(ctx, id, DirectEliminationTransition{
		To:          StatusEnd,
		CompletedAt: &completedAt,
		From:        []Status{StatusActive},
	})

	return s.afterUpdate(ctx, id, err, "only an active direct elimination round can be completed")
}

func (s *directEliminationService) afterUpdate(
	ctx context.Context,
	id uuid.UUID,
	err error,
	conflictMessage string,
) (*DirectEliminationOutput, error) {
	if err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("update direct elimination: %w",
				errs.Public(conflictMessage, err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update direct elimination: %w", err))
	}

	de, err := s.repo.GetDirectEliminationByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated direct elimination: %w", err))
	}

	return &DirectEliminationOutput{Body: newDirectEliminationResponse(*de)}, nil
}
