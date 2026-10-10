package competitor

import (
	"context"
	"fmt"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/utils"
)

const (
	CompetitorDefaultPageSize = 20
	CompetitorMinPageSize     = 1
	CompetitorMaxPageSize     = 100
)

type CompetitorService interface {
	CreateCompetitor(ctx context.Context, input *CompetitorCreateInput) (*CompetitorOutput, error)
	GetCompetitorByID(ctx context.Context, input *CompetitorIDInput) (*CompetitorOutput, error)
	ListCompetitors(ctx context.Context, input *CompetitorListInput) (*CompetitorListOutput, error)
	UpdateCompetitorByID(ctx context.Context, input *CompetitorUpdateInput) (*CompetitorOutput, error)
	DeleteCompetitor(ctx context.Context, input *CompetitorIDInput) (*struct{}, error)
}

type competitorService struct {
	repo CompetitorRepository
}

func NewCompetitorService(repo CompetitorRepository) CompetitorService {
	return &competitorService{repo: repo}
}

func (s *competitorService) CreateCompetitor(
	ctx context.Context,
	input *CompetitorCreateInput,
) (*CompetitorOutput, error) {
	firstName := strings.TrimSpace(input.Body.FirstName)
	lastName := strings.TrimSpace(input.Body.LastName)
	if firstName == "" {
		return nil, errs.HumaError(errs.Public("first name must not be blank", errs.ErrInvalidInput))
	}
	if lastName == "" {
		return nil, errs.HumaError(errs.Public("last name must not be blank", errs.ErrInvalidInput))
	}

	rating := RatingU
	if input.Body.Rating != "" {
		parsed, err := parseRating(input.Body.Rating)
		if err != nil {
			return nil, errs.HumaError(err)
		}
		rating = parsed
	}

	competitor := &Competitor{
		FirstName: firstName,
		LastName:  lastName,
		Rating:    rating,
		Team:      strings.TrimSpace(input.Body.Team),
	}

	if err := s.repo.CreateCompetitor(ctx, competitor); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create competitor: %w", err))
	}
	return &CompetitorOutput{Body: newCompetitorResponse(*competitor)}, nil
}

func (s *competitorService) GetCompetitorByID(
	ctx context.Context,
	input *CompetitorIDInput,
) (*CompetitorOutput, error) {
	id, err := utils.ParseUUID(input.ID, "competitor id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	competitor, err := s.repo.GetCompetitorByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get competitor: %w", err))
	}

	return &CompetitorOutput{Body: newCompetitorResponse(*competitor)}, nil
}

func (s *competitorService) UpdateCompetitorByID(
	ctx context.Context,
	input *CompetitorUpdateInput,
) (*CompetitorOutput, error) {
	id, err := utils.ParseUUID(input.ID, "competitor id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	update, err := competitorUpdateFrom(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if err := s.repo.UpdateCompetitorByID(ctx, id, *update); err != nil {
		return nil, errs.HumaError(fmt.Errorf("update competitor: %w", err))
	}

	competitor, err := s.repo.GetCompetitorByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get updated competitor: %w", err))
	}
	return &CompetitorOutput{Body: newCompetitorResponse(*competitor)}, nil
}

func competitorUpdateFrom(body CompetitorUpdateBody) (*CompetitorUpdate, error) {
	var update CompetitorUpdate
	if body.FirstName != nil {
		firstName := strings.TrimSpace(*body.FirstName)
		if firstName == "" {
			return nil, errs.Public("first name must not be blank", errs.ErrInvalidInput)
		}
		update.FirstName = &firstName
	}
	if body.LastName != nil {
		lastName := strings.TrimSpace(*body.LastName)
		if lastName == "" {
			return nil, errs.Public("last name must not be blank", errs.ErrInvalidInput)
		}
		update.LastName = &lastName
	}
	if body.Rating != nil {
		rating, err := parseRating(*body.Rating)
		if err != nil {
			return nil, err
		}
		update.Rating = &rating
	}
	if body.Team != nil {
		// An empty team is allowed: it clears the team.
		team := strings.TrimSpace(*body.Team)
		update.Team = &team
	}
	if update == (CompetitorUpdate{}) {
		return nil, errs.Public("provide at least one field to update", errs.ErrInvalidInput)
	}
	return &update, nil
}

func (s *competitorService) ListCompetitors(
	ctx context.Context,
	input *CompetitorListInput,
) (*CompetitorListOutput, error) {
	limit := input.Limit
	if limit <= 0 {
		limit = CompetitorDefaultPageSize
	}
	limit = utils.Clamp(limit, CompetitorMinPageSize, CompetitorMaxPageSize)
	offset := max(input.Offset, 0)

	competitors, total, err := s.repo.ListCompetitors(ctx, CompetitorListFilter{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list competitors: %w", err))
	}

	data := make([]CompetitorResponse, 0, len(competitors))
	for _, competitor := range competitors {
		data = append(data, newCompetitorResponse(competitor))
	}
	return &CompetitorListOutput{Body: CompetitorListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *competitorService) DeleteCompetitor(
	ctx context.Context,
	input *CompetitorIDInput,
) (*struct{}, error) {
	id, err := utils.ParseUUID(input.ID, "competitor id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if err := s.repo.DeleteCompetitor(ctx, id); err != nil {
		return nil, errs.HumaError(fmt.Errorf("delete competitor: %w", err))
	}
	return nil, nil
}

func parseRating(raw string) (Rating, error) {
	rating := Rating(strings.TrimSpace(raw).ToUpper())
	if !rating.IsValid() {
		return "", errs.Public("rating must be one of A, B, C, D, E, or U", errs.ErrInvalidInput)
	}
	return rating, nil
}
