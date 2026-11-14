package scoring

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"boutline/internal/cache"

	"github.com/google/uuid"
)

// Cache is automatically invalidated on write, but this TTL is an extra guarantee against stale data
const historyCacheTTL = 30 * time.Second

// cachedScoringRepository caches ListScoringHistory, the endpoint a live bout's
// scoreboard polls repeatedly, and invalidates it on every write to that bout.
// Every other method passes straight through to inner.
type cachedScoringRepository struct {
	inner ScoringRepository
	cache cache.Cache
}

func NewCachedScoringRepository(inner ScoringRepository, c cache.Cache) ScoringRepository {
	return &cachedScoringRepository{inner: inner, cache: c}
}

// Cache key for a bout's scoring history
func historyCacheKey(boutID uuid.UUID) string {
	return fmt.Sprintf("scoring:bout:%s:history", boutID)
}

func (r *cachedScoringRepository) ListScoringHistory(ctx context.Context, boutID uuid.UUID) ([]Scoring, error) {
	return cache.Fetch(ctx, r.cache, historyCacheKey(boutID), historyCacheTTL,
		func(ctx context.Context) ([]Scoring, error) {
			return r.inner.ListScoringHistory(ctx, boutID)
		})
}

func (r *cachedScoringRepository) clearHistoryCache(ctx context.Context, boutID uuid.UUID) {
	if _, err := r.cache.Drop(ctx, historyCacheKey(boutID)); err != nil {
		slog.Error("clear scoring history cache", "bout_id", boutID, "err", err)
	}
}

func (r *cachedScoringRepository) CreateScoring(ctx context.Context, scoring *Scoring) error {
	if err := r.inner.CreateScoring(ctx, scoring); err != nil {
		return err
	}

	r.clearHistoryCache(ctx, scoring.BoutID)

	return nil
}

func (r *cachedScoringRepository) UpdateScoring(ctx context.Context, scoring *Scoring) error {
	if err := r.inner.UpdateScoring(ctx, scoring); err != nil {
		return err
	}

	r.clearHistoryCache(ctx, scoring.BoutID)

	return nil
}

func (r *cachedScoringRepository) RevokeScoring(ctx context.Context, scoring *Scoring) error {
	if err := r.inner.RevokeScoring(ctx, scoring); err != nil {
		return err
	}

	r.clearHistoryCache(ctx, scoring.BoutID)

	return nil
}

func (r *cachedScoringRepository) GetScoringByID(ctx context.Context, id int64) (*Scoring, error) {
	return r.inner.GetScoringByID(ctx, id)
}

func (r *cachedScoringRepository) ListScoring(
	ctx context.Context,
	filter ScoringListFilter,
) ([]Scoring, int64, error) {
	return r.inner.ListScoring(ctx, filter)
}
