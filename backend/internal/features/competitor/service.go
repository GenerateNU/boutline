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
	competitor, err := competitorFromCreate(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if err := s.repo.CreateCompetitor(ctx, competitor); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create competitor: %w", err))
	}
	return &CompetitorOutput{Body: newCompetitorResponse(*competitor)}, nil
}

func competitorFromCreate(body CompetitorCreateBody) (*Competitor, error) {
	eventID, err := utils.ParseUUID(body.EventID, "event id")
	if err != nil {
		return nil, err
	}

	firstName := strings.TrimSpace(body.FirstName)
	if firstName == "" {
		return nil, errs.Public("first name must not be blank", errs.ErrInvalidInput)
	}
	lastName := strings.TrimSpace(body.LastName)
	if lastName == "" {
		return nil, errs.Public("last name must not be blank", errs.ErrInvalidInput)
	}

	gender := Gender(body.Gender)
	if !gender.IsValid() {
		return nil, errs.Public("gender must be either F, M, or O", errs.ErrInvalidInput)
	}
	birthdate, err := parseBirthdate(body.Birthdate)
	if err != nil {
		return nil, err
	}
	division := strings.TrimSpace(body.Division)
	if division == "" {
		return nil, errs.Public("division must not be blank", errs.ErrInvalidInput)
	}

	rating := RatingU
	if body.Rating != "" {
		rating, err = parseRating(body.Rating)
		if err != nil {
			return nil, err
		}
	}
	if err := validateRatingYear(body.RatingYear); err != nil {
		return nil, err
	}

	return &Competitor{
		EventID:       eventID,
		FirstName:     firstName,
		LastName:      lastName,
		Gender:        gender,
		Birthdate:     birthdate,
		Division:      division,
		Rating:        rating,
		RatingYear:    body.RatingYear,
		PrimaryClub:   optionalText(body.PrimaryClub),
		SecondaryClub: optionalText(body.SecondaryClub),
		MemberNumber:  optionalText(body.MemberNumber),
		Team:          strings.TrimSpace(body.Team),
	}, nil
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
	if body.Gender != nil {
		gender := Gender(*body.Gender)
		if !gender.IsValid() {
			return nil, errs.Public("gender must be either F, M, or O", errs.ErrInvalidInput)
		}
		update.Gender = &gender
	}
	if body.Birthdate != nil {
		birthdate, err := parseBirthdate(*body.Birthdate)
		if err != nil {
			return nil, err
		}
		update.Birthdate = &birthdate
	}
	if body.Division != nil {
		division := strings.TrimSpace(*body.Division)
		if division == "" {
			return nil, errs.Public("division must not be blank", errs.ErrInvalidInput)
		}
		update.Division = &division
	}
	if body.Rating != nil {
		rating, err := parseRating(*body.Rating)
		if err != nil {
			return nil, err
		}
		update.Rating = &rating
	}
	if body.RatingYear != nil {
		if err := validateRatingYear(body.RatingYear); err != nil {
			return nil, err
		}
		update.RatingYear = body.RatingYear
	}
	// For these, an empty string is allowed: it clears the value.
	update.PrimaryClub = trimmed(body.PrimaryClub)
	update.SecondaryClub = trimmed(body.SecondaryClub)
	update.MemberNumber = trimmed(body.MemberNumber)
	update.Team = trimmed(body.Team)

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

	filter := CompetitorListFilter{
		Limit:  limit,
		Offset: offset,
	}
	if input.EventID != "" {
		eventID, err := utils.ParseUUID(input.EventID, "event id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		filter.EventID = &eventID
	}
	if input.Rating != "" {
		rating, err := parseRating(input.Rating)
		if err != nil {
			return nil, errs.HumaError(err)
		}
		filter.Rating = &rating
	}
	if team := strings.TrimSpace(input.Team); team != "" {
		filter.Team = &team
	}

	competitors, total, err := s.repo.ListCompetitors(ctx, filter)
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
