package tournament

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

// tournamentNameTrigramExpr must match the expression indexed by
// idx_tournaments_name_trgm exactly, or the search falls back to a sequential scan.
const tournamentNameTrigramExpr = "name"

type TournamentRepository interface {
	CreateTournament(ctx context.Context, tournament *Tournament) error
	GetTournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error)
	GetTournamentByCode(ctx context.Context, code string) (*Tournament, error)
	ListTournaments(ctx context.Context, filter TournamentListFilter) ([]Tournament, int64, error)
	ListTournamentCountries(ctx context.Context, filter TournamentCountryFilter) ([]TournamentCountryCount, int64, error)
	UpdateTournamentByID(ctx context.Context, id uuid.UUID, update TournamentUpdate) error
	TransitionTournamentByID(ctx context.Context, id uuid.UUID, transition TournamentTransition) error
}

type TournamentUpdate struct {
	Name       *string
	Visibility *TournamentVisibility
	StartTime  *time.Time
	City       *string
	Country    *string
}

func (e TournamentUpdate) columns() map[string]any {
	columns := make(map[string]any, 5)

	if e.Name != nil {
		columns["name"] = *e.Name
	}
	if e.Visibility != nil {
		columns["visibility"] = *e.Visibility
	}
	if e.StartTime != nil {
		columns["start_time"] = *e.StartTime
	}
	if e.City != nil {
		columns["city"] = nullIfEmpty(*e.City)
	}
	if e.Country != nil {
		columns["country"] = nullIfEmpty(*e.Country)
	}

	return columns
}

type TournamentTransition struct {
	To          TournamentStatus
	StartedAt   *time.Time
	CompletedAt *time.Time
	From        []TournamentStatus
}

func (t TournamentTransition) columns() map[string]any {
	columns := map[string]any{"status": t.To}
	if t.StartedAt != nil {
		columns["started_at"] = *t.StartedAt
	}
	if t.CompletedAt != nil {
		columns["completed_at"] = *t.CompletedAt
	}

	return columns
}

type TournamentListFilter struct {
	Status     TournamentStatus
	Term       string
	StartFrom  time.Time
	StartTo    time.Time
	Visibility TournamentVisibility
	Club       string
	Country    string
	Limit      int
	Offset     int
}

type TournamentCountryFilter struct {
	Visibility TournamentVisibility
	Limit      int
	Offset     int
}

type TournamentCountryCount struct {
	Code            string
	TournamentCount int64
}

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}
	return value
}

type tournamentRepository struct {
	db *gorm.DB
}

func NewTournamentRepository(db *gorm.DB) TournamentRepository {
	return &tournamentRepository{db: db}
}

// CreateTournament inserts the tournament's Memberships too, through gorm's
// has-many save. Both inserts share the transaction gorm opens around every
// Create, which exists only while SkipDefaultTransaction stays off.
func (r *tournamentRepository) CreateTournament(ctx context.Context, tournament *Tournament) error {
	if err := r.db.WithContext(ctx).Create(tournament).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create tournament: %w", errs.ErrDuplicate)
		}
		if errors.Is(err, gorm.ErrForeignKeyViolated) {
			return fmt.Errorf("create tournament: %w",
				errs.Public("created_by must reference an existing user", errs.ErrInvalidInput))
		}
		return fmt.Errorf("create tournament: %w", err)
	}

	return nil
}

func (r *tournamentRepository) GetTournamentByID(ctx context.Context, id uuid.UUID) (*Tournament, error) {
	var tournament Tournament

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&tournament).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select tournament %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select tournament %s: %w", id, err)
	}

	return &tournament, nil
}

func (r *tournamentRepository) GetTournamentByCode(ctx context.Context, code string) (*Tournament, error) {
	var tournament Tournament

	err := r.db.WithContext(ctx).Where("code = ?", code).First(&tournament).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select tournament by code: %w", errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select tournament by code: %w", err)
	}

	return &tournament, nil
}

func (r *tournamentRepository) UpdateTournamentByID(
	ctx context.Context,
	id uuid.UUID,
	update TournamentUpdate,
) error {
	return r.updateByID(ctx, id, update.columns(), TournamentEditableStatuses())
}

func (r *tournamentRepository) TransitionTournamentByID(
	ctx context.Context,
	id uuid.UUID,
	transition TournamentTransition,
) error {
	return r.updateByID(ctx, id, transition.columns(), transition.From)
}

func (r *tournamentRepository) updateByID(
	ctx context.Context,
	id uuid.UUID,
	columns map[string]any,
	allowedStatuses []TournamentStatus,
) error {
	query := r.db.WithContext(ctx).Model(&Tournament{}).Where("id = ?", id)
	if len(allowedStatuses) > 0 {
		query = query.Where("status IN ?", allowedStatuses)
	}

	result := query.Updates(columns)
	if result.Error != nil {
		return fmt.Errorf("update tournament %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetTournamentByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update tournament %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *tournamentRepository) ListTournaments(ctx context.Context, filter TournamentListFilter) ([]Tournament, int64, error) {
	query := r.db.WithContext(ctx).Model(&Tournament{})
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Visibility != "" {
		query = query.Where("visibility = ?", filter.Visibility)
	}
	if !filter.StartFrom.IsZero() {
		query = query.Where("start_time >= ?", filter.StartFrom)
	}
	if !filter.StartTo.IsZero() {
		query = query.Where("start_time < ?", filter.StartTo)
	}
	if filter.Country != "" {
		query = query.Where("country = ?", filter.Country)
	}
	if filter.Club != "" {
		// Raw SQL: importing the competitor package here would be an import cycle.
		// Joins through events because competitors.tournament_id is nullable.
		query = query.Where(`EXISTS (
			SELECT 1 FROM competitors
			JOIN events ON events.id = competitors.event_id
			WHERE events.tournament_id = tournaments.id
			AND (competitors.primary_club = ? OR competitors.secondary_club = ?))`,
			filter.Club, filter.Club)
	}
	query = utils.TrigramMatch(query, tournamentNameTrigramExpr, filter.Term)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count tournaments: %w", err)
	}

	query = utils.TrigramOrder(query, tournamentNameTrigramExpr, filter.Term, "created_at DESC", "id")

	tournaments := make([]Tournament, 0, filter.Limit)
	err := query.
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&tournaments).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select tournaments: %w", err)
	}

	return tournaments, total, nil
}

func (r *tournamentRepository) ListTournamentCountries(
	ctx context.Context,
	filter TournamentCountryFilter,
) ([]TournamentCountryCount, int64, error) {
	query := r.db.WithContext(ctx).Model(&Tournament{}).Where("country IS NOT NULL AND country <> ''")
	if filter.Visibility != "" {
		query = query.Where("visibility = ?", filter.Visibility)
	}

	var total int64
	if err := query.Distinct("country").Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count tournament countries: %w", err)
	}

	countries := make([]TournamentCountryCount, 0, filter.Limit)
	err := query.
		Select("country AS code, COUNT(*) AS tournament_count").
		Group("country").
		Order("country ASC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Scan(&countries).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select tournament countries: %w", err)
	}

	return countries, total, nil
}
