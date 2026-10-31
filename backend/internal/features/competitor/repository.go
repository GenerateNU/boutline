package competitor

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	competitorNameTrigramExpr = "first_name || ' ' || last_name"
	competitorTeamTrigramExpr = "team"
)

type CompetitorRepository interface {
	CreateCompetitor(ctx context.Context, competitor *Competitor) error
	GetCompetitorByID(ctx context.Context, id uuid.UUID) (*Competitor, error)
	ListCompetitors(ctx context.Context, filter CompetitorListFilter) ([]Competitor, int64, error)
	UpdateCompetitorByID(ctx context.Context, id uuid.UUID, update CompetitorUpdate) error
	DeleteCompetitor(ctx context.Context, id uuid.UUID) error
	ListCompetitorTeams(ctx context.Context, filter CompetitorTeamListFilter) ([]CompetitorTeamCount, int64, error)
}

type CompetitorTeamListFilter struct {
	Term         string
	TournamentID *uuid.UUID
	Limit        int
	Offset       int
}

// CompetitorTeamCount is one distinct team matching a team search, with how
// many competitors are on it.
type CompetitorTeamCount struct {
	Team  string
	Count int64
}

// CompetitorUpdate holds the fields a patch changes; a nil field is left alone.
// EventID is not here on purpose: competitors belong to one event and are not moved.
type CompetitorUpdate struct {
	FirstName     *string
	LastName      *string
	Gender        *Gender
	Birthdate     *time.Time
	Division      *string
	Rating        *Rating
	RatingYear    *int16
	PrimaryClub   *string
	SecondaryClub *string
	MemberNumber  *string
	Team          *string
}

type CompetitorListFilter struct {
	IDs          []uuid.UUID // empty means don't filter by id
	EventID      *uuid.UUID  // nil means don't filter by event
	TournamentID *uuid.UUID  // nil means don't filter by tournament
	Rating       *Rating     // nil means don't filter by rating
	Team         *string     // nil means don't filter by team
	Term         string      // fuzzy match against name; empty means don't filter
	Limit        int
	Offset       int
}

type competitorRepository struct {
	db *gorm.DB
}

func NewCompetitorRepository(db *gorm.DB) CompetitorRepository {
	return &competitorRepository{db: db}
}

func (u CompetitorUpdate) columns() map[string]any {
	columns := make(map[string]any, 11)
	if u.FirstName != nil {
		columns["first_name"] = *u.FirstName
	}
	if u.LastName != nil {
		columns["last_name"] = *u.LastName
	}
	if u.Gender != nil {
		columns["gender"] = string(*u.Gender)
	}
	if u.Birthdate != nil {
		columns["birthdate"] = *u.Birthdate
	}
	if u.Division != nil {
		columns["division"] = *u.Division
	}
	if u.Rating != nil {
		columns["rating"] = string(*u.Rating)
	}
	if u.RatingYear != nil {
		columns["rating_year"] = *u.RatingYear
	}
	if u.PrimaryClub != nil {
		columns["primary_club"] = nullIfEmpty(*u.PrimaryClub)
	}
	if u.SecondaryClub != nil {
		columns["secondary_club"] = nullIfEmpty(*u.SecondaryClub)
	}
	if u.MemberNumber != nil {
		columns["member_number"] = nullIfEmpty(*u.MemberNumber)
	}
	if u.Team != nil {
		columns["team"] = *u.Team
	}
	return columns
}

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

func (r *competitorRepository) CreateCompetitor(ctx context.Context, competitor *Competitor) error {
	if err := r.db.WithContext(ctx).Create(competitor).Error; err != nil {
		return translateCompetitorWriteError("create competitor", err)
	}
	return nil
}

func (r *competitorRepository) GetCompetitorByID(ctx context.Context, id uuid.UUID) (*Competitor, error) {
	var competitor Competitor

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&competitor).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select competitor %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select competitor %s: %w", id, err)
	}

	return &competitor, nil
}

func (r *competitorRepository) UpdateCompetitorByID(
	ctx context.Context,
	id uuid.UUID,
	update CompetitorUpdate,
) error {
	result := r.db.WithContext(ctx).Model(&Competitor{}).Where("id = ?", id).Updates(update.columns())
	if result.Error != nil {
		return translateCompetitorWriteError(fmt.Sprintf("update competitor %s", id), result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("update competitor %s: %w", id, errs.ErrNotFound)
	}
	return nil
}

func (r *competitorRepository) ListCompetitors(
	ctx context.Context,
	filter CompetitorListFilter,
) ([]Competitor, int64, error) {
	query := r.db.WithContext(ctx).Model(&Competitor{})
	if filter.EventID != nil {
		query = query.Where("event_id = ?", *filter.EventID)
	}
	if filter.TournamentID != nil {
		query = query.Where("tournament_id = ?", *filter.TournamentID)
	}
	if filter.Rating != nil {
		query = query.Where("rating = ?", string(*filter.Rating))
	}
	if filter.Team != nil {
		query = query.Where("team = ?", *filter.Team)
	}
	if len(filter.IDs) > 0 {
		query = query.Where("id IN ?", filter.IDs)
	}
	query = utils.TrigramMatch(query, competitorNameTrigramExpr, filter.Term)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count competitors: %w", err)
	}

	// With no term there is no relevance to rank by, so the roster falls back
	// to alphabetical order rather than insertion order.
	query = utils.TrigramOrder(query, competitorNameTrigramExpr, filter.Term, "last_name, first_name, id", "id")

	competitors := make([]Competitor, 0, filter.Limit)

	err := query.
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&competitors).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select competitors: %w", err)
	}
	return competitors, total, nil
}

// ListCompetitorTeams matches distinct team names rather than competitor
// rows, so a team with many rostered competitors doesn't crowd out other
// matching teams in the results. There is no teams table yet: team is just a
// free-text column on competitors.
func (r *competitorRepository) ListCompetitorTeams(
	ctx context.Context,
	filter CompetitorTeamListFilter,
) ([]CompetitorTeamCount, int64, error) {
	expr := competitorTeamTrigramExpr

	// Built fresh rather than reused: chaining Find's Select/Group onto the
	// same *gorm.DB used for the Distinct Count carries the Distinct clause
	// over, and SELECT DISTINCT ... ORDER BY word_similarity(...) is
	// rejected because that expression isn't in the select list.
	var total int64
	// team is "" for an unaffiliated competitor, which is not a club.
	countQuery := utils.TrigramMatch(
		r.db.WithContext(ctx).Model(&Competitor{}).Where("team <> ''"), expr, filter.Term)
	if filter.TournamentID != nil {
		countQuery = countQuery.Where("tournament_id = ?", *filter.TournamentID)
	}
	if err := countQuery.Distinct(expr).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count competitor team list: %w", err)
	}

	var teams []CompetitorTeamCount
	findQuery := utils.TrigramMatch(
		r.db.WithContext(ctx).Model(&Competitor{}).Where("team <> ''"), expr, filter.Term)
	if filter.TournamentID != nil {
		findQuery = findQuery.Where("tournament_id = ?", *filter.TournamentID)
	}
	findQuery = findQuery.
		Select(expr + " AS team, COUNT(*) AS count").
		Group(expr)
	// team is the GROUP BY key, so it's also the tiebreaker: id no longer
	// identifies a row once rows are grouped.
	findQuery = utils.TrigramOrder(findQuery, expr, filter.Term, expr, expr)
	err := findQuery.
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&teams).Error
	if err != nil {
		return nil, 0, fmt.Errorf("list competitor teams: %w", err)
	}
	return teams, total, nil
}

func (r *competitorRepository) DeleteCompetitor(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&Competitor{}, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("delete competitor %s: %w", id, errs.ErrConflict)
		}
		return fmt.Errorf("delete competitor %s: %w", id, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("delete competitor %s: %w", id, errs.ErrNotFound)
	}

	return nil
}

// Maps database constraint errors to client-actionable errors
func translateCompetitorWriteError(op string, err error) error {
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("event does not exist", errs.ErrInvalidInput))
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return fmt.Errorf("%s: %w", op,
			errs.Public(DuplicateMemberNumberMessage, errs.ErrDuplicate))
	}
	if errors.Is(err, gorm.ErrCheckConstraintViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("competitor fields violate a constraint", errs.ErrInvalidInput))
	}
	return fmt.Errorf("%s: %w", op, err)
}

const DuplicateMemberNumberMessage = "a competitor with this member number already exists in this event"
