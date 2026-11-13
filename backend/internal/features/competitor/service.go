package competitor

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"boutline/internal/errs"
	"boutline/internal/features/event"
	"boutline/internal/features/tournament"
	"boutline/internal/features/tournamentuser"
	"boutline/internal/features/user"
	"boutline/internal/utils"

	"github.com/google/uuid"
)

type TournamentLookup interface {
	GetTournamentByID(ctx context.Context, id uuid.UUID) (*tournament.Tournament, error)
}

type EventLookup interface {
	GetEventByID(ctx context.Context, id uuid.UUID) (*event.Event, error)
}

// TournamentMembershipLookup is the subset of the tournament-user repository needed here.
type TournamentMembershipLookup interface {
	GetTournamentUser(ctx context.Context, tournamentID, userID uuid.UUID) (*tournamentuser.TournamentUser, error)
}

// AthleteLinker resolves a member number to the athlete it identifies, creating the athlete if needed.
type AthleteLinker interface {
	UpsertAthleteByMemberNumber(ctx context.Context, memberNumber string) (uuid.UUID, error)
}

var errCompetitorDeleteForbidden = errs.Public(
	"only the competitor's owner or the tournament's creator or admins can delete this competitor", errs.ErrForbidden)

const (
	CompetitorDefaultPageSize = 20
	CompetitorMinPageSize     = 1
	CompetitorMaxPageSize     = 100
	CompetitorMaxIDs          = 100
)

type CompetitorService interface {
	CreateCompetitor(ctx context.Context, input *CompetitorCreateInput) (*CompetitorOutput, error)
	GetCompetitorByID(ctx context.Context, input *CompetitorIDInput) (*CompetitorOutput, error)
	ListCompetitors(ctx context.Context, input *CompetitorListInput) (*CompetitorListOutput, error)
	UpdateCompetitorByID(ctx context.Context, input *CompetitorUpdateInput) (*CompetitorOutput, error)
	DeleteCompetitor(ctx context.Context, input *CompetitorIDInput) (*struct{}, error)
	ListTeamsByTournament(ctx context.Context, input *TeamListInput) (*TeamListOutput, error)
	ListClubs(ctx context.Context, input *ClubListInput) (*TeamListOutput, error)
}

type competitorService struct {
	repo        CompetitorRepository
	events      EventLookup
	tournaments TournamentLookup
	memberships TournamentMembershipLookup
	athletes    AthleteLinker
}

func NewCompetitorService(
	repo CompetitorRepository,
	events EventLookup,
	tournaments TournamentLookup,
	memberships TournamentMembershipLookup,
	athletes AthleteLinker,
) CompetitorService {
	return &competitorService{
		repo: repo, events: events, tournaments: tournaments, memberships: memberships, athletes: athletes,
	}
}

func (s *competitorService) CreateCompetitor(
	ctx context.Context,
	input *CompetitorCreateInput,
) (*CompetitorOutput, error) {
	competitor, err := competitorFromCreate(input.Body)
	if err != nil {
		return nil, errs.HumaError(err)
	}
	owningEvent, err := s.events.GetEventByID(ctx, competitor.EventID)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get event: %w", err))
	}
	competitor.TournamentID = &owningEvent.TournamentID
	if callerID, ok := user.UserIDFrom(ctx); ok {
		competitor.UserID = &callerID
	}
	if err := s.repo.CreateCompetitor(ctx, competitor); err != nil {
		return nil, errs.HumaError(fmt.Errorf("create competitor: %w", err))
	}
	if competitor.MemberNumber != nil {
		competitor.AthleteID = s.linkAthlete(ctx, competitor.ID, *competitor.MemberNumber)
	}
	return &CompetitorOutput{Body: newCompetitorResponse(*competitor)}, nil
}

// linkAthlete is best-effort: a failure is logged and never fails the request.
func (s *competitorService) linkAthlete(ctx context.Context, competitorID uuid.UUID, memberNumber string) *uuid.UUID {
	if memberNumber == "" {
		return nil
	}
	athleteID, err := s.athletes.UpsertAthleteByMemberNumber(ctx, memberNumber)
	if err != nil {
		slog.ErrorContext(ctx, "upsert athlete", "competitor_id", competitorID, "err", err)
		return nil
	}
	if err := s.repo.SetCompetitorAthlete(ctx, competitorID, memberNumber, athleteID); err != nil {
		slog.ErrorContext(ctx, "set competitor athlete", "competitor_id", competitorID, "err", err)
		return nil
	}
	return &athleteID
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

	memberNumber, err := parseMemberNumber(body.MemberNumber)
	if err != nil {
		return nil, err
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
		MemberNumber:  optionalText(memberNumber),
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
	if update.MemberNumber != nil {
		s.linkAthlete(ctx, id, *update.MemberNumber)
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
	update.Team = trimmed(body.Team)
	if body.MemberNumber != nil {
		number, err := parseMemberNumber(*body.MemberNumber)
		if err != nil {
			return nil, err
		}
		update.MemberNumber = &number
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
	limit, offset := page(input.Limit, input.Offset)

	filter := CompetitorListFilter{
		Term:   strings.TrimSpace(input.Query),
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
	if input.TournamentID != "" {
		tournamentID, err := utils.ParseUUID(input.TournamentID, "tournament_id")
		if err != nil {
			return nil, errs.HumaError(err)
		}
		filter.TournamentID = &tournamentID
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
	ids, err := utils.ParseUUIDList(input.IDs, "ids")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if len(ids) > CompetitorMaxIDs {
		return nil, errs.HumaError(errs.Public(
			fmt.Sprintf("ids must not contain more than %d values", CompetitorMaxIDs), errs.ErrInvalidInput))
	}
	filter.IDs = ids

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
	stored, err := s.repo.GetCompetitorByID(ctx, id)
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("get competitor: %w", err))
	}
	if err := s.authorizeCompetitorDelete(ctx, stored); err != nil {
		return nil, errs.HumaError(fmt.Errorf("delete competitor: %w", err))
	}
	if err := s.repo.DeleteCompetitor(ctx, id); err != nil {
		if errors.Is(err, errs.ErrConflict) {
			return nil, errs.HumaError(fmt.Errorf("delete competitor: %w",
				errs.Public("a competitor who has fenced a bout cannot be deleted", err)))
		}
		return nil, errs.HumaError(fmt.Errorf("delete competitor: %w", err))
	}
	return nil, nil
}

func (s *competitorService) authorizeCompetitorDelete(ctx context.Context, stored *Competitor) error {
	caller, ok := user.UserIDFrom(ctx)
	if !ok {
		return errCompetitorDeleteForbidden
	}
	if stored.UserID != nil && *stored.UserID == caller {
		return nil
	}
	if stored.TournamentID == nil {
		return errCompetitorDeleteForbidden
	}

	owningTournament, err := s.tournaments.GetTournamentByID(ctx, *stored.TournamentID)
	if err != nil {
		return fmt.Errorf("get tournament: %w", err)
	}
	if owningTournament.CreatedBy == caller {
		return nil
	}

	membership, err := s.memberships.GetTournamentUser(ctx, *stored.TournamentID, caller)
	if err != nil {
		if errors.Is(err, errs.ErrNotFound) {
			return errCompetitorDeleteForbidden
		}
		return fmt.Errorf("get tournament user: %w", err)
	}
	if membership.Role != tournamentuser.TournamentUserRoleAdmin {
		return errCompetitorDeleteForbidden
	}
	return nil
}

func (s *competitorService) ListTeamsByTournament(
	ctx context.Context,
	input *TeamListInput,
) (*TeamListOutput, error) {
	tournamentID, err := utils.ParseUUID(input.TournamentID, "tournament id")
	if err != nil {
		return nil, errs.HumaError(err)
	}
	if _, err := s.tournaments.GetTournamentByID(ctx, tournamentID); err != nil {
		return nil, errs.HumaError(fmt.Errorf("get tournament: %w", err))
	}

	limit, offset := page(input.Limit, input.Offset)

	teams, total, err := s.repo.ListCompetitorTeams(ctx, CompetitorTeamListFilter{
		Term:         strings.TrimSpace(input.Query),
		TournamentID: &tournamentID,
		Limit:        limit,
		Offset:       offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list teams: %w", err))
	}

	data := make([]TeamResponse, 0, len(teams))
	for _, team := range teams {
		data = append(data, TeamResponse{Name: team.Team, CompetitorCount: team.Count})
	}
	return &TeamListOutput{Body: TeamListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func (s *competitorService) ListClubs(
	ctx context.Context,
	input *ClubListInput,
) (*TeamListOutput, error) {
	limit, offset := page(input.Limit, input.Offset)

	clubs, total, err := s.repo.ListCompetitorClubs(ctx, CompetitorClubListFilter{
		Term:   strings.TrimSpace(input.Query),
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, errs.HumaError(fmt.Errorf("list clubs: %w", err))
	}

	data := make([]TeamResponse, 0, len(clubs))
	for _, club := range clubs {
		data = append(data, TeamResponse{Name: club.Team, CompetitorCount: club.Count})
	}
	return &TeamListOutput{Body: TeamListBody{
		Data:   data,
		Total:  total,
		Limit:  limit,
		Offset: offset,
	}}, nil
}

func page(limit, offset int) (int, int) {
	if limit <= 0 {
		limit = CompetitorDefaultPageSize
	}

	return utils.Clamp(limit, CompetitorMinPageSize, CompetitorMaxPageSize), max(offset, 0)
}
