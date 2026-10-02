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
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	TournamentMinPageSize     = 1
	TournamentDefaultPageSize = 20
	TournamentMaxPageSize     = 100

	TournamentCodeLength      = 6
	tournamentCodeAlphabet    = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
	tournamentCodeMaxAttempts = 5
)

type TournamentService interface {
	// Tournament Endpoints
	CreateTournament(ctx context.Context, input *TournamentCreateInput) (*TournamentOutput, error)
	GetTournamentByID(ctx context.Context, input *TournamentIDInput) (*TournamentOutput, error)
	GetTournamentByCode(ctx context.Context, input *TournamentCodeInput) (*TournamentOutput, error)
	ListTournaments(ctx context.Context, input *TournamentListInput) (*TournamentListOutput, error)
	UpdateTournamentByID(ctx context.Context, input *TournamentUpdateInput) (*TournamentOutput, error)
	StartTournament(ctx context.Context, input *TournamentIDInput) (*TournamentOutput, error)
	CompleteTournament(ctx context.Context, input *TournamentIDInput) (*TournamentOutput, error)

	// TournamentUser Endpoints
	AddTournamentUser(ctx context.Context, input *TournamentUserAddInput) (*TournamentUserOutput, error)
	ListTournamentUsers(ctx context.Context, input *TournamentUserListInput) (*TournamentUserListOutput, error)
	UpdateTournamentUserRole(ctx context.Context, input *TournamentUserUpdateRoleInput) (*TournamentUserOutput, error)
	RemoveTournamentUser(ctx context.Context, input *TournamentUserRemoveInput) (*struct{}, error)
}

type tournamentService struct {
	repo           TournamentRepository
	membershipRepo TournamentUserRepository
}

func NewTournamentService(repo TournamentRepository, membershipRepo TournamentUserRepository) TournamentService {
	return &tournamentService{repo: repo, membershipRepo: membershipRepo}
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

	createdBy, err := utils.ParseUUID(input.Body.CreatedBy, "created_by")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	tournament := &Tournament{
		Name:       name,
		Visibility: visibility,
		Status:     TournamentStatusPending,
		CreatedBy:  createdBy,
		StartTime:  input.Body.StartTime,
	}
	if err := s.createWithGeneratedCode(ctx, tournament); err != nil {
		return nil, errs.HumaError(err)
	}

	return &TournamentOutput{Body: NewTournamentResponse(*tournament)}, nil
}

func (s *tournamentService) createWithGeneratedCode(ctx context.Context, tournament *Tournament) error {
	for range tournamentCodeMaxAttempts {
		code, err := generateTournamentCode()
		if err != nil {
			return fmt.Errorf("generate tournament code: %w", err)
		}
		tournament.Code = code

		err = s.repo.CreateTournament(ctx, tournament)
		if err == nil {
			return nil
		}
		if !errors.Is(err, errs.ErrDuplicate) {
			return fmt.Errorf("create tournament: %w", err)
		}
	}

	return fmt.Errorf("create tournament: exhausted %d code attempts", tournamentCodeMaxAttempts)
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
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	tournament, err := s.repo.GetTournamentByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get tournament: %w", err))
	}

	return &TournamentOutput{Body: NewTournamentResponse(*tournament)}, nil
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

	return &TournamentOutput{Body: NewTournamentResponse(*tournament)}, nil
}

func (s *tournamentService) ListTournaments(
	ctx context.Context,
	input *TournamentListInput,
) (*TournamentListOutput, error) {
	if input.Status != "" && !input.Status.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown status %q", input.Status), errs.ErrInvalidInput))
	}
	limit, offset := page(input.Limit, input.Offset)

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
		data = append(data, NewTournamentResponse(listed))
	}

	return &TournamentListOutput{Body: TournamentListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *tournamentService) UpdateTournamentByID(
	ctx context.Context,
	input *TournamentUpdateInput,
) (*TournamentOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
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

	edit.StartTime = body.StartTime

	if edit.Name == nil && edit.Visibility == nil && edit.StartTime == nil {
		return edit, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}

	return edit, nil
}

func (s *tournamentService) StartTournament(
	ctx context.Context,
	input *TournamentIDInput,
) (*TournamentOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	startedAt := time.Now().UTC()

	err = s.repo.TransitionTournamentByID(ctx, id, TournamentTransition{
		To:        TournamentStatusActive,
		StartedAt: &startedAt,
		From:      []TournamentStatus{TournamentStatusPending},
	})

	return s.afterUpdate(ctx, id, err, "only a pending tournament can be started")
}

func (s *tournamentService) CompleteTournament(
	ctx context.Context,
	input *TournamentIDInput,
) (*TournamentOutput, error) {
	id, err := utils.ParseUUID(input.ID, "id")
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

	return &TournamentOutput{Body: NewTournamentResponse(*tournament)}, nil
}

func (s *tournamentService) AddTournamentUser(
	ctx context.Context,
	input *TournamentUserAddInput,
) (*TournamentUserOutput, error) {
	tournamentID, userID, err := parseMembershipIDs(input.TournamentID, input.Body.UserID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if !input.Body.Role.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown role %q", input.Body.Role), errs.ErrInvalidInput))
	}

	membership := &TournamentUser{
		TournamentID: tournamentID,
		UserID:       userID,
		Role:         input.Body.Role,
	}
	if err := s.membershipRepo.CreateTournamentUser(ctx, membership); err != nil {
		return nil, errs.HumaError(fmt.Errorf("add tournament user: %w", err))
	}

	return &TournamentUserOutput{Body: newTournamentUserResponse(*membership)}, nil
}

func (s *tournamentService) ListTournamentUsers(
	ctx context.Context,
	input *TournamentUserListInput,
) (*TournamentUserListOutput, error) {
	tournamentID, err := utils.ParseUUID(input.TournamentID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	limit, offset := page(input.Limit, input.Offset)

	memberships, err := s.membershipRepo.ListTournamentUsers(ctx, tournamentID, limit, offset)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list tournament users: %w", err))
	}

	total, err := s.membershipRepo.CountUsersInTournament(ctx, tournamentID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list tournament users: %w", err))
	}

	data := make([]TournamentUserResponse, 0, len(memberships))
	for _, membership := range memberships {
		data = append(data, newTournamentUserResponse(membership))
	}

	return &TournamentUserListOutput{Body: TournamentUserListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *tournamentService) UpdateTournamentUserRole(
	ctx context.Context,
	input *TournamentUserUpdateRoleInput,
) (*TournamentUserOutput, error) {
	tournamentID, userID, err := parseMembershipIDs(input.TournamentID, input.UserID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if !input.Body.Role.IsValid() {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("unknown role %q", input.Body.Role), errs.ErrInvalidInput))
	}

	if err := s.membershipRepo.UpdateTournamentUserRole(ctx, tournamentID, userID, input.Body.Role); err != nil {
		return nil, errs.HumaError(fmt.Errorf("update tournament user role: %w", err))
	}

	membership, err := s.membershipRepo.GetTournamentUser(ctx, tournamentID, userID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated tournament user: %w", err))
	}

	return &TournamentUserOutput{Body: newTournamentUserResponse(*membership)}, nil
}

func (s *tournamentService) RemoveTournamentUser(
	ctx context.Context,
	input *TournamentUserRemoveInput,
) (*struct{}, error) {
	tournamentID, userID, err := parseMembershipIDs(input.TournamentID, input.UserID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.membershipRepo.DeleteTournamentUser(ctx, tournamentID, userID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("remove tournament user: %w", err))
	}

	return nil, nil
}

func parseMembershipIDs(rawTournamentID, rawUserID string) (uuid.UUID, uuid.UUID, error) {
	tournamentID, err := utils.ParseUUID(rawTournamentID, "id")
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}

	userID, err := utils.ParseUUID(rawUserID, "user_id")
	if err != nil {
		return uuid.Nil, uuid.Nil, err
	}

	return tournamentID, userID, nil
}

func page(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = TournamentDefaultPageSize
	}

	return utils.Clamp(limit, TournamentMinPageSize, TournamentMaxPageSize), max(offset, 0)
}
