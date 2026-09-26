package match

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MatchRepository interface {
	CreateMatch(ctx context.Context, match *Match) error
	GetMatchByID(ctx context.Context, id uuid.UUID) (*Match, error)
	ListMatches(ctx context.Context, filter MatchListFilter) ([]Match, int64, error)
	EditMatchByID(ctx context.Context, id uuid.UUID, edit MatchEdit) error
	TransitionMatchByID(ctx context.Context, id uuid.UUID, transition MatchTransition) error
	DeleteMatchByID(ctx context.Context, id uuid.UUID) error
}

type MatchEdit struct {
	Location         *string
	Time             *time.Time
	RefereeID        *uuid.UUID
	TimeLimitSeconds *int
	PointsToWin      *int
	GroupNumber      *int
	Competitor1ID    *uuid.UUID
	Competitor2ID    *uuid.UUID
}

func (e MatchEdit) columns() map[string]any {
	columns := make(map[string]any, 8)

	if e.Location != nil {
		columns["location"] = *e.Location
	}
	if e.Time != nil {
		columns["time"] = *e.Time
	}
	if e.RefereeID != nil {
		columns["referee_id"] = *e.RefereeID
	}
	if e.TimeLimitSeconds != nil {
		columns["time_limit_seconds"] = *e.TimeLimitSeconds
	}
	if e.PointsToWin != nil {
		columns["points_to_win"] = *e.PointsToWin
	}
	if e.GroupNumber != nil {
		columns["group_number"] = *e.GroupNumber
	}
	if e.Competitor1ID != nil {
		columns["competitor_1_id"] = *e.Competitor1ID
	}
	if e.Competitor2ID != nil {
		columns["competitor_2_id"] = *e.Competitor2ID
	}

	return columns
}

type MatchTransition struct {
	To   MatchStatus
	Time *time.Time
	From []MatchStatus
}

func (t MatchTransition) columns() map[string]any {
	columns := map[string]any{"status": t.To}
	if t.Time != nil {
		columns["time"] = *t.Time
	}

	return columns
}

type MatchListFilter struct {
	TournamentID *uuid.UUID
	Status       MatchStatus
	Limit        int
	Offset       int
}

type matchRepository struct {
	db *gorm.DB
}

func NewMatchRepository(db *gorm.DB) MatchRepository {
	return &matchRepository{db: db}
}

func (r *matchRepository) CreateMatch(ctx context.Context, match *Match) error {
	if err := r.db.WithContext(ctx).Create(match).Error; err != nil {
		return translateMatchWriteError("create match", err)
	}

	return nil
}

func (r *matchRepository) GetMatchByID(ctx context.Context, id uuid.UUID) (*Match, error) {
	var match Match

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&match).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select match %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select match %s: %w", id, err)
	}

	return &match, nil
}

func (r *matchRepository) ListMatches(ctx context.Context, filter MatchListFilter) ([]Match, int64, error) {
	query := r.db.WithContext(ctx).Model(&Match{})
	if filter.TournamentID != nil {
		query = query.Where("tournament_id = ?", *filter.TournamentID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count matches: %w", err)
	}

	matches := make([]Match, 0, filter.Limit)
	err := query.
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&matches).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select matches: %w", err)
	}

	return matches, total, nil
}

func (r *matchRepository) EditMatchByID(ctx context.Context, id uuid.UUID, edit MatchEdit) error {
	return r.updateByID(ctx, id, edit.columns(), MatchEditableStatuses())
}

func (r *matchRepository) TransitionMatchByID(ctx context.Context, id uuid.UUID, transition MatchTransition) error {
	return r.updateByID(ctx, id, transition.columns(), transition.From)
}

func (r *matchRepository) updateByID(
	ctx context.Context,
	id uuid.UUID,
	columns map[string]any,
	allowedStatuses []MatchStatus,
) error {
	query := r.db.WithContext(ctx).Model(&Match{}).Where("id = ?", id)
	if len(allowedStatuses) > 0 {
		query = query.Where("status IN ?", allowedStatuses)
	}

	result := query.Updates(columns)
	if result.Error != nil {
		return translateMatchWriteError(fmt.Sprintf("update match %s", id), result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetMatchByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update match %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *matchRepository) DeleteMatchByID(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND status IN ?", id, MatchDeletableStatuses()).
		Delete(&Match{})
	if result.Error != nil {
		return fmt.Errorf("delete match %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetMatchByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("delete match %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func translateMatchWriteError(op string, err error) error {
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("tournament_id or referee_id does not reference an existing record", errs.ErrInvalidInput))
	}
	if errors.Is(err, gorm.ErrCheckConstraintViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("match fields violate a constraint", errs.ErrInvalidInput))
	}

	return fmt.Errorf("%s: %w", op, err)
}
