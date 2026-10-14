package competitor

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CompetitorRepository interface {
	CreateCompetitor(ctx context.Context, competitor *Competitor) error
	GetCompetitorByID(ctx context.Context, id uuid.UUID) (*Competitor, error)
	ListCompetitors(ctx context.Context, filter CompetitorListFilter) ([]Competitor, int64, error)
	ListTeamsByTournament(ctx context.Context, filter TeamListFilter) ([]TeamCount, int64, error)
	UpdateCompetitorByID(ctx context.Context, id uuid.UUID, update CompetitorUpdate) error
	DeleteCompetitor(ctx context.Context, id uuid.UUID) error
}

type CompetitorUpdate struct {
	FirstName *string
	LastName  *string
	Rating    *Rating
	Team      *string
}

type CompetitorListFilter struct {
	TournamentID *uuid.UUID
	Rating       *Rating
	Team         *string
	Search       *string
	Limit        int
	Offset       int
}

type TeamCount struct {
	Team            string
	CompetitorCount int64
}

type TeamListFilter struct {
	TournamentID uuid.UUID
	Search       *string
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
	if filter.TournamentID != nil {
		query = query.Where("tournament_id = ?", *filter.TournamentID)
	}
	if filter.Rating != nil {
		query = query.Where("rating = ?", string(*filter.Rating))
	}
	if filter.Team != nil {
		query = query.Where("team = ?", *filter.Team)
	}
	if filter.Search != nil {
		query = query.Where("first_name || ' ' || last_name ILIKE ?", "%"+*filter.Search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count competitors: %w", err)
	}

	competitors := make([]Competitor, 0, filter.Limit)

	err := query.
		Order("last_name").
		Order("first_name").
		Order("id").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&competitors).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select competitors: %w", err)
	}
	return competitors, total, nil
}

func (r *competitorRepository) ListTeamsByTournament(
	ctx context.Context,
	filter TeamListFilter,
) ([]TeamCount, int64, error) {
	base := func() *gorm.DB {
		query := r.db.WithContext(ctx).Model(&Competitor{}).
			Where("tournament_id = ?", filter.TournamentID).
			Where("team <> ''")
		if filter.Search != nil {
			query = query.Where("team ILIKE ?", "%"+*filter.Search+"%")
		}
		return query
	}

	var total int64
	if err := base().Distinct("team").Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count teams: %w", err)
	}

	teams := make([]TeamCount, 0, filter.Limit)

	err := base().
		Select("team, count(*) AS competitor_count").
		Group("team").
		Order("team").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Scan(&teams).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select teams: %w", err)
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
