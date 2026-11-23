package bout

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"
	"boutline/internal/features/pool"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BoutRepository interface {
	CreateBout(ctx context.Context, bout *Bout) error
	GetBoutByID(ctx context.Context, id uuid.UUID) (*Bout, error)
	ListBouts(ctx context.Context, filter BoutListFilter) ([]Bout, int64, error)
	UpdateBoutByID(ctx context.Context, id uuid.UUID, update BoutUpdate) error
	ClaimBoutByID(ctx context.Context, id, refereeID uuid.UUID) error
	TransitionBoutByID(ctx context.Context, id uuid.UUID, transition BoutTransition) error
	DeleteBoutByID(ctx context.Context, id uuid.UUID) error
	ListCompetitorBouts(ctx context.Context, competitorID uuid.UUID) ([]CompetitorBoutRow, error)
}

// CompetitorBoutRow is one pool or tableau bout seen from one competitor. Score and
// OpponentScore are summed from unrevoked scorings after the bouts are selected.
type CompetitorBoutRow struct {
	ID                uuid.UUID  `gorm:"column:id"`
	Status            BoutStatus `gorm:"column:status"`
	PoolNumber        *int       `gorm:"column:pool_number"`
	RoundSize         *int       `gorm:"column:round_size"`
	Slot              *int       `gorm:"column:slot"`
	OpponentID        uuid.UUID  `gorm:"column:opponent_id"`
	OpponentFirstName string     `gorm:"column:opponent_first_name"`
	OpponentLastName  string     `gorm:"column:opponent_last_name"`
	Score             int        `gorm:"-"`
	OpponentScore     int        `gorm:"-"`
}

type BoutUpdate struct {
	Location         *string
	StartTime        *time.Time
	RefereeID        *uuid.UUID
	TimeLimitSeconds *int
	PointsToWin      *int
	GroupNumber      *int
	Competitor1ID    *uuid.UUID
	Competitor2ID    *uuid.UUID
}

func (e BoutUpdate) columns() map[string]any {
	columns := make(map[string]any, 8)

	if e.Location != nil {
		columns["location"] = *e.Location
	}
	if e.StartTime != nil {
		columns["start_time"] = *e.StartTime
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

type BoutTransition struct {
	To          BoutStatus
	StartedAt   *time.Time
	CompletedAt *time.Time
	From        []BoutStatus
}

func (t BoutTransition) columns() map[string]any {
	columns := map[string]any{"status": t.To}
	if t.StartedAt != nil {
		columns["started_at"] = *t.StartedAt
	}
	if t.CompletedAt != nil {
		columns["completed_at"] = *t.CompletedAt
	}

	return columns
}

type BoutListFilter struct {
	IDs          []uuid.UUID
	TournamentID *uuid.UUID
	PoolID       *uuid.UUID
	Status       BoutStatus
	Limit        int
	Offset       int
}

type boutRepository struct {
	db *gorm.DB
}

func NewBoutRepository(db *gorm.DB) BoutRepository {
	return &boutRepository{db: db}
}

func (r *boutRepository) CreateBout(ctx context.Context, bout *Bout) error {
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Pool bouts copy their pool (§11.1). Stopgap until pool create (§11.2)
		// makes them.
		if bout.PoolID != nil {
			if err := fillBoutFromPool(tx, bout); err != nil {
				return err
			}
		}

		return tx.Create(bout).Error
	})
	if err != nil {
		return translateBoutWriteError("create bout", err)
	}

	return nil
}

// fillBoutFromPool copies the pool's referee, strip and number onto the bout and gives it the pool's next slot.
func fillBoutFromPool(tx *gorm.DB, bout *Bout) error {
	poolID := *bout.PoolID

	// Serializes with pool edits and other pool-bout creates.
	if err := pool.LockPoolStage(tx, poolID); err != nil {
		return err
	}

	// Copy the pool's referee, strip and number onto the bout.
	var p pool.Pool
	err := tx.Select("referee_id", "number", "strip").Take(&p, "id = ?", poolID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errs.Public("pool_id does not reference an existing pool", errs.ErrInvalidInput)
	}
	if err != nil {
		return fmt.Errorf("select pool %s: %w", poolID, err)
	}
	bout.RefereeID = p.RefereeID
	bout.GroupNumber = p.Number
	bout.Location = p.Strip

	// Append the bout to the end of the pool's bout order: slot is what
	// orders a pool's bouts, since bouts made together share a created_at. The
	// lock keeps MAX + 1 unique; the unique index is a backstop.
	var slot int
	err = tx.Table("bouts").Where("pool_id = ?", poolID).Select("COALESCE(MAX(slot), 0) + 1").Scan(&slot).Error
	if err != nil {
		return fmt.Errorf("next slot in pool %s: %w", poolID, err)
	}
	bout.Slot = &slot

	return nil
}

func (r *boutRepository) GetBoutByID(ctx context.Context, id uuid.UUID) (*Bout, error) {
	var bout Bout

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&bout).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select bout %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select bout %s: %w", id, err)
	}

	return &bout, nil
}

func (r *boutRepository) ListBouts(ctx context.Context, filter BoutListFilter) ([]Bout, int64, error) {
	query := r.db.WithContext(ctx).Model(&Bout{})
	if filter.TournamentID != nil {
		query = query.Where("tournament_id = ?", *filter.TournamentID)
	}
	if filter.PoolID != nil {
		query = query.Where("pool_id = ?", *filter.PoolID)
	}
	if len(filter.IDs) > 0 {
		query = query.Where("id IN ?", filter.IDs)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count bouts: %w", err)
	}

	bouts := make([]Bout, 0, filter.Limit)
	err := query.
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&bouts).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select bouts: %w", err)
	}

	return bouts, total, nil
}

func (r *boutRepository) UpdateBoutByID(ctx context.Context, id uuid.UUID, update BoutUpdate) error {
	return r.updateByID(ctx, id, update.columns(), BoutEditableStatuses())
}

func (r *boutRepository) TransitionBoutByID(ctx context.Context, id uuid.UUID, transition BoutTransition) error {
	return r.updateByID(ctx, id, transition.columns(), transition.From)
}

func (r *boutRepository) updateByID(
	ctx context.Context,
	id uuid.UUID,
	columns map[string]any,
	allowedStatuses []BoutStatus,
) error {
	query := r.db.WithContext(ctx).Model(&Bout{}).Where("id = ?", id)
	if len(allowedStatuses) > 0 {
		query = query.Where("status IN ?", allowedStatuses)
	}

	result := query.Updates(columns)
	if result.Error != nil {
		return translateBoutWriteError(fmt.Sprintf("update bout %s", id), result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetBoutByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update bout %s: %w", id, errs.ErrConflict)
	}

	return nil
}

// The conditional WHERE is the race guard: of two referees claiming at once, only one matches.
func (r *boutRepository) ClaimBoutByID(ctx context.Context, id, refereeID uuid.UUID) error {
	result := r.db.WithContext(ctx).Model(&Bout{}).
		Where("id = ?", id).
		Where("status IN ?", BoutEditableStatuses()).
		Where("referee_id IS NULL OR referee_id = ?", refereeID).
		Update("referee_id", refereeID)
	if result.Error != nil {
		return translateBoutWriteError(fmt.Sprintf("claim bout %s", id), result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetBoutByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("claim bout %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *boutRepository) DeleteBoutByID(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND status IN ?", id, BoutDeletableStatuses()).
		Delete(&Bout{})
	if result.Error != nil {
		return fmt.Errorf("delete bout %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetBoutByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("delete bout %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func translateBoutWriteError(op string, err error) error {
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("tournament_id, referee_id, pool_id, or a competitor id does not reference an existing record", errs.ErrInvalidInput))
	}
	if errors.Is(err, gorm.ErrCheckConstraintViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("bout fields violate a constraint", errs.ErrInvalidInput))
	}

	return fmt.Errorf("%s: %w", op, err)
}

// ListCompetitorBouts orders pool bouts first, by pool and slot, then tableau bouts
// from the first round to the final.
func (r *boutRepository) ListCompetitorBouts(ctx context.Context, competitorID uuid.UUID) ([]CompetitorBoutRow, error) {
	db := r.db.WithContext(ctx)

	var found int64
	if err := db.Table("competitors").Where("id = ?", competitorID).Limit(1).Count(&found).Error; err != nil {
		return nil, fmt.Errorf("check competitor %s: %w", competitorID, err)
	}
	if found == 0 {
		return nil, fmt.Errorf("select competitor %s: %w", competitorID, errs.ErrNotFound)
	}

	rows := []CompetitorBoutRow{}
	err := db.Table("bouts AS b").
		Select(`b.id, b.status, p.number AS pool_number, b.round_size, b.slot,
			o.id AS opponent_id, o.first_name AS opponent_first_name, o.last_name AS opponent_last_name`).
		Joins("JOIN competitors o ON o.id IN (b.competitor_1_id, b.competitor_2_id) AND o.id <> ?", competitorID).
		Joins("LEFT JOIN pools p ON p.id = b.pool_id").
		Where("? IN (b.competitor_1_id, b.competitor_2_id)", competitorID).
		Where("b.pool_id IS NOT NULL OR b.direct_elimination_id IS NOT NULL").
		Order("b.pool_id IS NULL, p.number, b.round_size DESC, b.slot").
		Scan(&rows).Error
	if err != nil {
		return nil, fmt.Errorf("select bouts for competitor %s: %w", competitorID, err)
	}
	if len(rows) == 0 {
		return rows, nil
	}

	boutIDs := make([]uuid.UUID, len(rows))
	for i, row := range rows {
		boutIDs[i] = row.ID
	}
	var sums []struct {
		BoutID       uuid.UUID
		CompetitorID uuid.UUID
		Points       int
	}
	err = db.Table("scorings").
		Select("bout_id, competitor_id, SUM(points) AS points").
		Where("bout_id IN ? AND revoked_at IS NULL", boutIDs).
		Group("bout_id, competitor_id").
		Scan(&sums).Error
	if err != nil {
		return nil, fmt.Errorf("sum scores for competitor %s: %w", competitorID, err)
	}

	for i := range rows {
		for _, sum := range sums {
			if sum.BoutID != rows[i].ID {
				continue
			}
			if sum.CompetitorID == competitorID {
				rows[i].Score = sum.Points
			} else {
				rows[i].OpponentScore = sum.Points
			}
		}
	}

	return rows, nil
}
