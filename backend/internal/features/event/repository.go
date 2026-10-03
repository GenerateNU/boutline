package event

import (
	"context"
	"errors"
	"fmt"
	"time"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventRepository interface {
	CreateEvent(ctx context.Context, event *Event) error
	GetEventByID(ctx context.Context, id uuid.UUID) (*Event, error)
	ListEvents(ctx context.Context, filter EventListFilter) ([]Event, int64, error)
	EditEventByID(ctx context.Context, id uuid.UUID, edit EventEdit) error
	DeleteEventByID(ctx context.Context, id uuid.UUID) error
}

type EventEdit struct {
	Name      *string
	StartTime *time.Time
}

func (e EventEdit) columns() map[string]any {
	columns := make(map[string]any, 2)

	if e.Name != nil {
		columns["name"] = *e.Name
	}
	if e.StartTime != nil {
		columns["start_time"] = *e.StartTime
	}

	return columns
}

type EventListFilter struct {
	TournamentID *uuid.UUID
	Status       EventStatus
	Limit        int
	Offset       int
}

type eventRepository struct {
	db *gorm.DB
}

func NewEventRepository(db *gorm.DB) EventRepository {
	return &eventRepository{db: db}
}

func (r *eventRepository) CreateEvent(ctx context.Context, event *Event) error {
	if err := r.db.WithContext(ctx).Create(event).Error; err != nil {
		return translateEventWriteError("create event", err)
	}

	return nil
}

func (r *eventRepository) GetEventByID(ctx context.Context, id uuid.UUID) (*Event, error) {
	var event Event

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&event).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select event %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select event %s: %w", id, err)
	}

	return &event, nil
}

func (r *eventRepository) ListEvents(ctx context.Context, filter EventListFilter) ([]Event, int64, error) {
	query := r.db.WithContext(ctx).Model(&Event{})
	if filter.TournamentID != nil {
		query = query.Where("tournament_id = ?", *filter.TournamentID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count events: %w", err)
	}

	events := make([]Event, 0, filter.Limit)
	err := query.
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&events).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select events: %w", err)
	}

	return events, total, nil
}

func (r *eventRepository) EditEventByID(ctx context.Context, id uuid.UUID, edit EventEdit) error {
	query := r.db.WithContext(ctx).Model(&Event{}).
		Where("id = ? AND status IN ?", id, EventEditableStatuses())

	result := query.Updates(edit.columns())
	if result.Error != nil {
		return translateEventWriteError(fmt.Sprintf("update event %s", id), result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetEventByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("update event %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func (r *eventRepository) DeleteEventByID(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).
		Where("id = ? AND status IN ?", id, EventDeletableStatuses()).
		Delete(&Event{})
	if result.Error != nil {
		return fmt.Errorf("delete event %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		if _, err := r.GetEventByID(ctx, id); err != nil {
			return err
		}
		return fmt.Errorf("delete event %s: %w", id, errs.ErrConflict)
	}

	return nil
}

func translateEventWriteError(op string, err error) error {
	if errors.Is(err, gorm.ErrForeignKeyViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("tournament_id does not reference an existing record", errs.ErrInvalidInput))
	}
	if errors.Is(err, gorm.ErrCheckConstraintViolated) {
		return fmt.Errorf("%s: %w", op,
			errs.Public("event fields violate a constraint", errs.ErrInvalidInput))
	}

	return fmt.Errorf("%s: %w", op, err)
}
