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

// Cache key for a bout's scoring history
func historyCacheKey(boutID uuid.UUID) string {
	return fmt.Sprintf("scoring:bout:%s:history", boutID)
}

// Cache key for version number on a bout's scoring history, used to gate race conditions
func historyGenKey(boutID uuid.UUID) string {
	return fmt.Sprintf("scoring:bout:%s:history:gen", boutID)
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

	genKey := historyGenKey(boutID)
	version, err := r.cache.Incr(ctx, genKey)
	if err != nil {
		slog.Error("read scoring history cache generation", "bout_id", boutID, "err", err)
	}

	scores, err := r.inner.ListScoringHistory(ctx, boutID)
	if err != nil {
		return nil, err
	}

	if _, err := r.cache.SetIfUnchanged(ctx, key, genKey, version, scores, historyCacheTTL); err != nil {
		slog.Error("write scoring history cache", "bout_id", boutID, "err", err)
	}

	return scores, nil
}

// clearHistoryCache bumps the generation and deletes the cache entry in one
// atomic step, so a read racing between the two can never observe the
// now-stale entry as a hit.
func (r *cachedScoringRepository) clearHistoryCache(ctx context.Context, boutID uuid.UUID) {
	if err := r.cache.IncrAndDel(ctx, historyGenKey(boutID), historyCacheKey(boutID)); err != nil {
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
