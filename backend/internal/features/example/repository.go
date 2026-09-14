package example

import (
	"context"
	"errors"
	"fmt"

	"boutline/internal/errs"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ExampleRepository is the seam the service is tested against: fake this
// interface in a unit test, use the gorm implementation below everywhere else.
type ExampleRepository interface {
	CreateExample(ctx context.Context, example *Example) error
	GetExampleByID(ctx context.Context, id uuid.UUID) (*Example, error)
	ListExamples(ctx context.Context, filter ExampleListFilter) ([]Example, int64, error)
	UpdateExampleByID(ctx context.Context, id uuid.UUID, update ExampleUpdate) error
	DeleteExample(ctx context.Context, id uuid.UUID) error
}

// ExampleUpdate is a patch: a nil field is left alone. The service rejects an
// empty one, so the repository can assume there is something to write.
type ExampleUpdate struct {
	Name   *string
	Status *ExampleStatus
}

// Sent to gorm as a map rather than a struct: Updates on a struct skips zero
// values, so an empty string would silently not be written.
func (u ExampleUpdate) columns() map[string]any {
	columns := make(map[string]any, 2)

	if u.Name != nil {
		columns["name"] = *u.Name
	}
	if u.Status != nil {
		columns["status"] = *u.Status
	}

	return columns
}

// ExampleListFilter is already validated and clamped by the service; the
// repository takes it at face value.
type ExampleListFilter struct {
	Status ExampleStatus
	Limit  int
	Offset int
}

type exampleRepository struct {
	db *gorm.DB
}

func NewExampleRepository(db *gorm.DB) ExampleRepository {
	return &exampleRepository{db: db}
}

func (r *exampleRepository) CreateExample(ctx context.Context, example *Example) error {
	if err := r.db.WithContext(ctx).Create(example).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("create example: %w", errs.ErrDuplicate)
		}
		return fmt.Errorf("create example: %w", err)
	}

	return nil
}

func (r *exampleRepository) GetExampleByID(ctx context.Context, id uuid.UUID) (*Example, error) {
	var example Example

	err := r.db.WithContext(ctx).Where("id = ?", id).First(&example).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("select example %s: %w", id, errs.ErrNotFound)
		}
		return nil, fmt.Errorf("select example %s: %w", id, err)
	}

	return &example, nil
}

// Model is required here: a map destination tells gorm nothing about the table,
// and it keeps the patch from being read as a set of primary-key conditions.
func (r *exampleRepository) UpdateExampleByID(ctx context.Context, id uuid.UUID, update ExampleUpdate) error {
	result := r.db.WithContext(ctx).Model(&Example{}).Where("id = ?", id).Updates(update.columns())
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("update example %s: %w", id, errs.ErrDuplicate)
		}
		return fmt.Errorf("update example %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("update example %s: %w", id, errs.ErrNotFound)
	}

	return nil
}

func (r *exampleRepository) ListExamples(ctx context.Context, filter ExampleListFilter) ([]Example, int64, error) {
	// Model is required: Count writes into an int64, which tells gorm nothing
	// about which table to count.
	query := r.db.WithContext(ctx).Model(&Example{})
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}

	// Counted before the page is fetched so the caller gets a total without a
	// second round trip through the same filter.
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("count examples: %w", err)
	}

	examples := make([]Example, 0, filter.Limit)
	err := query.
		Select("id", "name", "status", "created_at", "updated_at").
		Order("created_at DESC").
		Limit(filter.Limit).
		Offset(filter.Offset).
		Find(&examples).Error
	if err != nil {
		return nil, 0, fmt.Errorf("select examples: %w", err)
	}

	return examples, total, nil
}

func (r *exampleRepository) DeleteExample(ctx context.Context, id uuid.UUID) error {
	result := r.db.WithContext(ctx).Delete(&Example{}, "id = ?", id)
	if result.Error != nil {
		return fmt.Errorf("soft delete example %s: %w", id, result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("soft delete example %s: %w", id, errs.ErrNotFound)
	}

	return nil
}
