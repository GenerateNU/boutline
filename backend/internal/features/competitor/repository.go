package competitor

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"
	"boutline/internal/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	SearchCompetitors(ctx context.Context, filter CompetitorSearchFilter) ([]Competitor, int64, error)
	SearchCompetitorTeams(ctx context.Context, filter CompetitorTeamSearchFilter) ([]CompetitorTeamCount, int64, error)
}

type CompetitorSearchFilter struct {
	Term   string
	Limit  int
	Offset int
}

type CompetitorTeamSearchFilter struct {
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
	Rating *Rating // nil means don't filter by rating
	Team   *string // nil means don't filter by team
	Limit  int
	Offset int
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
		return fmt.Errorf("create competitor: %w", err)
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
		return fmt.Errorf("update competitor %s: %w", id, result.Error)
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
	if filter.Rating != nil {
		query = query.Where("rating = ?", string(*filter.Rating))
	}
	if filter.Team != nil {
		query = query.Where("team = ?", *filter.Team)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count competitors: %w", err)
	}

	competitors := make([]Competitor, 0, filter.Limit)

	err := query.
		Order("created_at DESC").
		Order("id").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&competitors).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select competitors: %w", err)
	}
	return competitors, total, nil
}

func (r *competitorRepository) SearchCompetitors(
	ctx context.Context,
	filter CompetitorSearchFilter,
) ([]Competitor, int64, error) {
	expr := competitorNameTrigramExpr
	query := utils.TrigramMatch(r.db.WithContext(ctx).Model(&Competitor{}), expr, filter.Term)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count competitor search: %w", err)
	}

	competitors := make([]Competitor, 0, filter.Limit)

	err := utils.TrigramOrder(query, expr, filter.Term).
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&competitors).Error
	if err != nil {
		return nil, 0, fmt.Errorf("search competitors: %w", err)
	}
	return competitors, total, nil
}

// SearchCompetitorTeams matches distinct team names rather than competitor
// rows, so a team with many rostered competitors doesn't crowd out other
// matching teams in the results. There is no teams table yet: team is just a
// free-text column on competitors.
func (r *competitorRepository) SearchCompetitorTeams(
	ctx context.Context,
	filter CompetitorTeamSearchFilter,
) ([]CompetitorTeamCount, int64, error) {
	expr := competitorTeamTrigramExpr

	// Built fresh rather than reused: chaining Find's Select/Group onto the
	// same *gorm.DB used for the Distinct Count carries the Distinct clause
	// over, and SELECT DISTINCT ... ORDER BY word_similarity(...) is
	// rejected because that expression isn't in the select list.
	var total int64
	countQuery := utils.TrigramMatch(r.db.WithContext(ctx).Model(&Competitor{}), expr, filter.Term)
	if filter.TournamentID != nil {
		countQuery = countQuery.Where("tournament_id = ?", *filter.TournamentID)
	}
	if err := countQuery.Distinct(expr).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count competitor team search: %w", err)
	}

	// team is the GROUP BY key, so ordering by word_similarity(term, team) is
	// a function of the grouped column rather than an ungrouped reference; the
	// tiebreaker is team itself, not id, since id no longer identifies a row.
	var teams []CompetitorTeamCount
	findQuery := utils.TrigramMatch(r.db.WithContext(ctx).Model(&Competitor{}), expr, filter.Term)
	if filter.TournamentID != nil {
		findQuery = findQuery.Where("tournament_id = ?", *filter.TournamentID)
	}
	err := findQuery.
		Select(expr + " AS team, COUNT(*) AS count").
		Group(expr).
		Clauses(clause.OrderBy{Expression: clause.Expr{
			SQL:  "word_similarity(?, " + expr + ") DESC, " + expr,
			Vars: []any{filter.Term},
		}}).
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&teams).Error
	if err != nil {
		return nil, 0, fmt.Errorf("search competitor teams: %w", err)
	}
	return teams, total, nil
}

func (r *competitorRepository) DeleteCompetitor(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&Competitor{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("delete competitor %s: %w", id, result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("delete competitor %s: %w", id, errs.ErrNotFound)
	}

	return nil
}
