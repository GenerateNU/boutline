package test

import (
	"testing"
	"time"

	"boutline/internal/cache"
	"boutline/internal/features/scoring"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCachedScoringRepository_ListScoringHistory(t *testing.T) {
	t.Parallel()

	boutID := uuid.New()
	seeded := scoring.Scoring{ID: 1, BoutID: boutID, Points: 1, CreatedAt: time.Now()}

	t.Run("caches a miss and serves the next call from cache", func(t *testing.T) {
		t.Parallel()

		inner := NewFakeScoringRepository(seeded)
		fakeCache := cache.NewFakeCache()
		repo := scoring.NewCachedScoringRepository(inner, fakeCache)

		first, err := repo.ListScoringHistory(t.Context(), boutID)
		require.NoError(t, err)
		require.Len(t, first, 1)
		assert.True(t, fakeCache.Has("scoring:bout:"+boutID.String()+":history"))

		// Mutate the inner repo directly: a second call hitting the cache must
		// still see the stale, pre-mutation data.
		inner.Scores[1] = scoring.Scoring{ID: 1, BoutID: boutID, Points: 99, CreatedAt: seeded.CreatedAt}

		second, err := repo.ListScoringHistory(t.Context(), boutID)
		require.NoError(t, err)
		require.Len(t, second, 1)
		assert.Equal(t, 1, second[0].Points)
	})

	t.Run("a cache error falls through to the inner repository", func(t *testing.T) {
		t.Parallel()

		inner := NewFakeScoringRepository(seeded)
		fakeCache := cache.NewFakeCache()
		fakeCache.Err = assert.AnError
		repo := scoring.NewCachedScoringRepository(inner, fakeCache)

		got, err := repo.ListScoringHistory(t.Context(), boutID)
		require.NoError(t, err)
		assert.Len(t, got, 1)
	})

	t.Run("a write landing between the db fetch and the cache fill is not overwritten", func(t *testing.T) {
		t.Parallel()

		inner := NewFakeScoringRepository(seeded)
		fakeCache := cache.NewFakeCache()
		repo := scoring.NewCachedScoringRepository(inner, fakeCache)
		cacheKey := "scoring:bout:" + boutID.String() + ":history"

		// Simulates a concurrent write landing after this read has already
		// fetched its (now stale) snapshot from the db, but before it reaches
		// the cache fill — the race the generation check guards against.
		inner.BeforeListScoringHistoryReturn = func() {
			require.NoError(t, repo.CreateScoring(t.Context(), &scoring.Scoring{BoutID: boutID, Points: 2}))
		}

		stale, err := repo.ListScoringHistory(t.Context(), boutID)
		require.NoError(t, err)
		require.Len(t, stale, 1, "the read already had this snapshot in hand before the write landed")
		assert.False(t, fakeCache.Has(cacheKey), "the read must not re-cache data a concurrent write already invalidated")

		inner.BeforeListScoringHistoryReturn = nil

		fresh, err := repo.ListScoringHistory(t.Context(), boutID)
		require.NoError(t, err)
		assert.Len(t, fresh, 2, "a read with no race in flight should see and cache the write")
		assert.True(t, fakeCache.Has(cacheKey))
	})
}

func TestCachedScoringRepository_InvalidatesOnWrite(t *testing.T) {
	t.Parallel()

	boutID := uuid.New()
	seeded := scoring.Scoring{ID: 1, BoutID: boutID, Points: 1, CreatedAt: time.Now()}

	cases := map[string]func(t *testing.T, repo scoring.ScoringRepository, inner *FakeScoringRepository){
		"create": func(t *testing.T, repo scoring.ScoringRepository, _ *FakeScoringRepository) {
			t.Helper()
			require.NoError(t, repo.CreateScoring(t.Context(), &scoring.Scoring{BoutID: boutID, Points: 1}))
		},
		"update": func(t *testing.T, repo scoring.ScoringRepository, _ *FakeScoringRepository) {
			t.Helper()
			require.NoError(t, repo.UpdateScoring(t.Context(), &scoring.Scoring{ID: 1, BoutID: boutID, Points: 2}))
		},
		"revoke": func(t *testing.T, repo scoring.ScoringRepository, _ *FakeScoringRepository) {
			t.Helper()
			now := time.Now()
			require.NoError(t, repo.RevokeScoring(t.Context(), &scoring.Scoring{ID: 1, BoutID: boutID, RevokedAt: &now}))
		},
	}

	for name, write := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			inner := NewFakeScoringRepository(seeded)
			fakeCache := cache.NewFakeCache()
			repo := scoring.NewCachedScoringRepository(inner, fakeCache)

			_, err := repo.ListScoringHistory(t.Context(), boutID)
			require.NoError(t, err)
			require.True(t, fakeCache.Has("scoring:bout:"+boutID.String()+":history"))

			write(t, repo, inner)

			assert.False(t, fakeCache.Has("scoring:bout:"+boutID.String()+":history"))
		})
	}
}
