package competitor

import (
	"context"
	"fmt"

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

type CompetitorUpdate struct {
	FirstName *string
	LastName  *string
	Rating    *Rating
	Team      *string
}

type CompetitorListFilter struct {
	TournamentID *uuid.UUID // nil means don't filter by tournament
	Rating       *Rating    // nil means don't filter by rating
	Team         *string    // nil means don't filter by team
	Term         string     // fuzzy match against name; empty means don't filter
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
	columns := make(map[string]any, 4)
	if u.FirstName != nil {
		columns["first_name"] = *u.FirstName
	}
	if u.LastName != nil {
		columns["last_name"] = *u.LastName
	}
	if u.Rating != nil {
		columns["rating"] = string(*u.Rating)
	}
	if u.Team != nil {
		columns["team"] = *u.Team
	}
	return columns
}

func (r *competitorRepository) CreateCompetitor(ctx context.Context, competitor *Competitor) error {
	if err := r.db.WithContext(ctx).Create(competitor).Error; err != nil {
		return utils.TranslateWriteError("create competitor", Competitor{}.TableName(), "", err)
	}

	return nil
}

func (r *competitorRepository) GetCompetitorByID(ctx context.Context, id uuid.UUID) (*Competitor, error) {
	var competitor Competitor

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&competitor).Error
	if err != nil {
		return nil, utils.TranslateReadError(fmt.Sprintf("select competitor %s", id), err)
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
		return utils.TranslateWriteError(fmt.Sprintf("update competitor %s", id), Competitor{}.TableName(), "", result.Error)
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
	if filter.TournamentID != nil {
		query = query.Where("tournament_id = ?", *filter.TournamentID)
	}
	if filter.Rating != nil {
		query = query.Where("rating = ?", string(*filter.Rating))
	}
	if filter.Team != nil {
		query = query.Where("team = ?", *filter.Team)
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
		return utils.TranslateDeleteError(fmt.Sprintf("delete competitor %s", id),
			"a competitor assigned to a bout cannot be deleted", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("delete competitor %s: %w", id, errs.ErrNotFound)
	}

	return nil
}
