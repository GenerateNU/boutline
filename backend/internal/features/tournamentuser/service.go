package tournamentuser

import (
	"context"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/features/tournament"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

const (
	TournamentUserMinPageSize     = 1
	TournamentUserDefaultPageSize = 20
	TournamentUserMaxPageSize     = 100
)

type TournamentUserService interface {
	AddTournamentUser(ctx context.Context, input *TournamentUserAddInput) (*TournamentUserOutput, error)
	ListTournamentUsers(ctx context.Context, input *TournamentUserListInput) (*TournamentUserListOutput, error)
	UpdateTournamentUserRole(ctx context.Context, input *TournamentUserUpdateRoleInput) (*TournamentUserOutput, error)
	RemoveTournamentUser(ctx context.Context, input *TournamentUserRemoveInput) (*struct{}, error)
	ListTournamentsByUser(
		ctx context.Context,
		input *TournamentUserTournamentsInput,
	) (*TournamentUserTournamentsOutput, error)
}

type tournamentUserService struct {
	repo TournamentUserRepository
}

func NewTournamentUserService(repo TournamentUserRepository) TournamentUserService {
	return &tournamentUserService{repo: repo}
}

func (s *tournamentUserService) AddTournamentUser(
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
	if err := s.repo.CreateTournamentUser(ctx, membership); err != nil {
		return nil, errs.HumaError(fmt.Errorf("add tournament user: %w", err))
	}

	return &TournamentUserOutput{Body: newTournamentUserResponse(*membership)}, nil
}

func (s *tournamentUserService) ListTournamentUsers(
	ctx context.Context,
	input *TournamentUserListInput,
) (*TournamentUserListOutput, error) {
	tournamentID, err := utils.ParseUUID(input.TournamentID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	limit, offset := page(input.Limit, input.Offset)

	memberships, err := s.repo.ListTournamentUsers(ctx, tournamentID, limit, offset)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list tournament users: %w", err))
	}

	total, err := s.repo.CountTournamentUsers(ctx, tournamentID)
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

func (s *tournamentUserService) UpdateTournamentUserRole(
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

	if err := s.repo.UpdateTournamentUserRole(ctx, tournamentID, userID, input.Body.Role); err != nil {
		return nil, errs.HumaError(fmt.Errorf("update tournament user role: %w", err))
	}

	membership, err := s.repo.GetTournamentUser(ctx, tournamentID, userID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated tournament user: %w", err))
	}

	return &TournamentUserOutput{Body: newTournamentUserResponse(*membership)}, nil
}

func (s *tournamentUserService) RemoveTournamentUser(
	ctx context.Context,
	input *TournamentUserRemoveInput,
) (*struct{}, error) {
	tournamentID, userID, err := parseMembershipIDs(input.TournamentID, input.UserID)
	if err != nil {
		return nil, errs.HumaError(err)
	}

	if err := s.repo.DeleteTournamentUser(ctx, tournamentID, userID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("remove tournament user: %w", err))
	}

	return nil, nil
}

func (s *tournamentUserService) ListTournamentsByUser(
	ctx context.Context,
	input *TournamentUserTournamentsInput,
) (*TournamentUserTournamentsOutput, error) {
	userID, err := utils.ParseUUID(input.UserID, "id")
	if err != nil {
		return nil, errs.HumaError(err)
	}

	limit, offset := page(input.Limit, input.Offset)

	tournaments, total, err := s.repo.ListTournamentsByUser(ctx, userID, limit, offset)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list tournaments for user: %w", err))
	}

	data := make([]tournament.TournamentResponse, 0, len(tournaments))
	for _, listed := range tournaments {
		data = append(data, tournament.NewTournamentResponse(listed))
	}

	return &TournamentUserTournamentsOutput{Body: TournamentUserTournamentsBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
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
		limit = TournamentUserDefaultPageSize
	}

	return utils.Clamp(limit, TournamentUserMinPageSize, TournamentUserMaxPageSize), max(offset, 0)
}
