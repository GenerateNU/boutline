package tournament

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"boutline/internal/errs"
	"boutline/internal/validators"

	"github.com/google/uuid"
)

const (
	TournamentDefaultPageSize = 20
	TournamentMaxPageSize     = 100

	TournamentCodeLength      = 6
	tournamentCodeAlphabet    = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	tournamentCodeMaxAttempts = 5
)

type TournamentService interface {
	CreateTournament(ctx context.Context, input *TournamentCreateInput) (*TournamentOutput, error)
	GetTournamentByID(ctx context.Context, input *TournamentIDInput) (*TournamentOutput, error)
	GetTournamentByCode(ctx context.Context, input *TournamentCodeInput) (*TournamentOutput, error)
	ListTournaments(ctx context.Context, input *TournamentListInput) (*TournamentListOutput, error)
	UpdateTournamentByID(ctx context.Context, input *TournamentUpdateInput) (*TournamentOutput, error)
	StartTournament(ctx context.Context, input *TournamentIDInput) (*TournamentOutput, error)
	CompleteTournament(ctx context.Context, input *TournamentIDInput) (*TournamentOutput, error)
}

type tournamentService struct {
	repo TournamentRepository
}

func NewTournamentService(repo TournamentRepository) TournamentService {
	return &tournamentService{repo: repo}
}

func NormalizeTournamentCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func (s *tournamentService) CreateTournament(
	ctx context.Context,
	input *TournamentCreateInput,
) (*TournamentOutput, error) {
	name := strings.TrimSpace(input.Body.Name)
	if name == "" {
		return nil, errs.HumaError(errs.Public("name must not be blank", errs.ErrInvalidInput))
	}

	visibility := input.Body.Visibility
	if visibility == "" {
		visibility = TournamentVisibilityPrivate
	}
	if !visibility.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown visibility %q", visibility), errs.ErrInvalidInput))
	}

	// TODO: once the user table is made, do a validation check here
	createdBy, err := validators.ParseUUID(input.Body.CreatedBy, "created_by")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	tournament, err := s.createWithGeneratedCode(ctx, name, visibility, createdBy)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	return &TournamentOutput{Body: newTournamentResponse(*tournament)}, nil
}

func (s *tournamentService) createWithGeneratedCode(
	ctx context.Context,
	name string,
	visibility TournamentVisibility,
	createdBy uuid.UUID,
) (*Tournament, error) {
	for range tournamentCodeMaxAttempts {
		code, err := generateTournamentCode()
		if err != nil {
			return nil, fmt.Errorf("generate tournament code: %w", err)
		}

		tournament := &Tournament{
			Name:       name,
			Visibility: visibility,
			Code:       code,
			Status:     TournamentStatusPending,
			CreatedBy:  createdBy,
		}

		err = s.repo.CreateTournament(ctx, tournament)
		if err == nil {
			return tournament, nil
		}
		if !errors.Is(err, errs.ErrDuplicate) {
			return nil, fmt.Errorf("create tournament: %w", err)
		}
	}

	return nil, fmt.Errorf("create tournament: exhausted %d code attempts", tournamentCodeMaxAttempts)
}

func generateTournamentCode() (string, error) {
	limit := big.NewInt(int64(len(tournamentCodeAlphabet)))

	code := make([]byte, TournamentCodeLength)
	for i := range code {
		n, err := rand.Int(rand.Reader, limit)
		if err != nil {
			return "", fmt.Errorf("read random index: %w", err)
		}
		code[i] = tournamentCodeAlphabet[n.Int64()]
	}

	return string(code), nil
}

func (s *tournamentService) GetTournamentByID(
	ctx context.Context,
	input *TournamentIDInput,
) (*TournamentOutput, error) {
	id, err := validators.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	tournament, err := s.repo.GetTournamentByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get tournament: %w", err))
	}

	return &TournamentOutput{Body: newTournamentResponse(*tournament)}, nil
}

func (s *tournamentService) GetTournamentByCode(
	ctx context.Context,
	input *TournamentCodeInput,
) (*TournamentOutput, error) {
	code := NormalizeTournamentCode(input.Code)
	if code == "" {
		return nil, errs.HumaError(errs.Public("code must not be blank", errs.ErrInvalidInput))
	}

	tournament, err := s.repo.GetTournamentByCode(ctx, code)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get tournament by code: %w", err))
	}

	return &TournamentOutput{Body: newTournamentResponse(*tournament)}, nil
}

func (s *tournamentService) ListTournaments(
	ctx context.Context,
	input *TournamentListInput,
) (*TournamentListOutput, error) {
	if input.Status != "" && !input.Status.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
	}
	limit := tournamentPageLimit(input.Limit)
	offset := max(input.Offset, 0)

	tournaments, total, err := s.repo.ListTournaments(ctx, TournamentListFilter{
		Status: input.Status,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list tournaments: %w", err))
	}

	data := make([]TournamentResponse, 0, len(tournaments))
	for _, listed := range tournaments {
		data = append(data, newTournamentResponse(listed))
	}

	return &TournamentListOutput{Body: TournamentListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func tournamentPageLimit(requested int) int {
	if requested <= 0 {
		return TournamentDefaultPageSize
	}

	return min(requested, TournamentMaxPageSize)
}

func (s *tournamentService) UpdateTournamentByID(
	ctx context.Context,
	input *TournamentUpdateInput,
) (*TournamentOutput, error) {
	id, err := validators.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	edit, err := tournamentEditFrom(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.EditTournamentByID(ctx, id, edit)

	return s.afterUpdate(ctx, id, err, "tournament has ended and can no longer be edited")
}

func tournamentEditFrom(body TournamentUpdateBody) (TournamentEdit, error) {
	var edit TournamentEdit

	if body.Name != nil {
		name := strings.TrimSpace(*body.Name)
		if name == "" {
			return edit, errs.Public("name must not be blank", errs.ErrInvalidInput)
		}
		edit.Name = &name
	}

	if body.Visibility != nil {
		if !body.Visibility.IsValid() {
			return edit, errs.Public(
				fmt.Sprintf("unknown visibility %q", *body.Visibility), errs.ErrInvalidInput)
		}
		edit.Visibility = body.Visibility
	}

	if edit.Name == nil && edit.Visibility == nil {
		return edit, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return edit, nil
}

func (s *tournamentService) StartTournament(
	ctx context.Context,
	input *TournamentIDInput,
) (*TournamentOutput, error) {
	id, err := validators.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	err = s.repo.TransitionTournamentByID(ctx, id, TournamentTransition{
		To:   TournamentStatusActive,
		From: []TournamentStatus{TournamentStatusPending},
	})

	return s.afterUpdate(ctx, id, err, "only a pending tournament can be started")
}

func (s *tournamentService) CompleteTournament(
	ctx context.Context,
	input *TournamentIDInput,
) (*TournamentOutput, error) {
	id, err := validators.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	completedAt := time.Now().UTC()

	err = s.repo.TransitionTournamentByID(ctx, id, TournamentTransition{
		To:          TournamentStatusEnd,
		CompletedAt: &completedAt,
		From:        []TournamentStatus{TournamentStatusActive},
	})

	return s.afterUpdate(ctx, id, err, "only an active tournament can be completed")
}

func (s *tournamentService) afterUpdate(
	ctx context.Context,
	id uuid.UUID,
	err error,
	conflictMessage string,
) (*TournamentOutput, error) {
	if err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("update tournament: %w",
				errs.Public(conflictMessage, err)))
		}

		return nil, errs.HumaError(fmt.Errorf("update tournament: %w", err))
	}

	tournament, err := s.repo.GetTournamentByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated tournament: %w", err))
	}

	return &TournamentOutput{Body: newTournamentResponse(*tournament)}, nil
}
