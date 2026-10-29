package scoring

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"boutline/internal/cache"

	"github.com/google/uuid"
)

// historyCacheTTL is a backstop: writes invalidate the cached history
// immediately, this just bounds staleness if an invalidation is ever missed.
const historyCacheTTL = 30 * time.Second

// cachedScoringRepository caches GetScoringHistory, the endpoint a live bout's
// scoreboard polls repeatedly, and invalidates it on every write to that bout.
// Every other method passes straight through to inner.
type cachedScoringRepository struct {
	inner ScoringRepository
	cache cache.Cache
}

func NewCachedScoringRepository(inner ScoringRepository, c cache.Cache) ScoringRepository {
	return &cachedScoringRepository{inner: inner, cache: c}
}

func historyCacheKey(boutID uuid.UUID) string {
	return fmt.Sprintf("scoring:bout:%s:history", boutID)
}

func (r *cachedScoringRepository) ListScoringHistory(ctx context.Context, boutID uuid.UUID) ([]Scoring, error) {
	key := historyCacheKey(boutID)

	var cached []Scoring
	hit, err := r.cache.Get(ctx, key, &cached)
	if err != nil {
		slog.Error("read scoring history cache", "bout_id", boutID, "err", err)
	} else if hit {
		return cached, nil
	}

	scores, err := r.inner.ListScoringHistory(ctx, boutID)
	if err != nil {
		return nil, err
	}

	if err := r.cache.Set(ctx, key, scores, historyCacheTTL); err != nil {
		slog.Error("write scoring history cache", "bout_id", boutID, "err", err)
	}

	return scores, nil
}

func (r *cachedScoringRepository) invalidateHistory(ctx context.Context, boutID uuid.UUID) {
	if err := r.cache.Del(ctx, historyCacheKey(boutID)); err != nil {
		slog.Error("invalidate scoring history cache", "bout_id", boutID, "err", err)
	}
}

func (r *cachedScoringRepository) CreateScoring(ctx context.Context, scoring *Scoring) error {
	if err := r.inner.CreateScoring(ctx, scoring); err != nil {
		return err
	}

	r.invalidateHistory(ctx, scoring.BoutID)

	return nil
}

func (r *cachedScoringRepository) UpdateScoring(ctx context.Context, scoring *Scoring) error {
	if err := r.inner.UpdateScoring(ctx, scoring); err != nil {
		return err
	}

	r.invalidateHistory(ctx, scoring.BoutID)

	return nil
}

func (r *cachedScoringRepository) RevokeScoring(ctx context.Context, scoring *Scoring) error {
	if err := r.inner.RevokeScoring(ctx, scoring); err != nil {
		return err
	}

	r.invalidateHistory(ctx, scoring.BoutID)

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
