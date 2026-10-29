package test

import (
	"context"
	"testing"
	"time"

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
		fakeCache := NewFakeCache()
		repo := scoring.NewCachedScoringRepository(inner, fakeCache)

		first, err := repo.ListScoringHistory(context.Background(), boutID)
		require.NoError(t, err)
		require.Len(t, first, 1)
		assert.True(t, fakeCache.Has("scoring:bout:"+boutID.String()+":history"))

		// Mutate the inner repo directly: a second call hitting the cache must
		// still see the stale, pre-mutation data.
		inner.Scores[1] = scoring.Scoring{ID: 1, BoutID: boutID, Points: 99, CreatedAt: seeded.CreatedAt}

		second, err := repo.ListScoringHistory(context.Background(), boutID)
		require.NoError(t, err)
		require.Len(t, second, 1)
		assert.Equal(t, 1, second[0].Points)
	})

	t.Run("a cache error falls through to the inner repository", func(t *testing.T) {
		t.Parallel()

		inner := NewFakeScoringRepository(seeded)
		fakeCache := NewFakeCache()
		fakeCache.Err = assert.AnError
		repo := scoring.NewCachedScoringRepository(inner, fakeCache)

		got, err := repo.ListScoringHistory(context.Background(), boutID)
		require.NoError(t, err)
		assert.Len(t, got, 1)
	})
}

func TestCachedScoringRepository_InvalidatesOnWrite(t *testing.T) {
	t.Parallel()

	boutID := uuid.New()
	seeded := scoring.Scoring{ID: 1, BoutID: boutID, Points: 1, CreatedAt: time.Now()}

	cases := map[string]func(t *testing.T, repo scoring.ScoringRepository, inner *FakeScoringRepository){
		"create": func(t *testing.T, repo scoring.ScoringRepository, _ *FakeScoringRepository) {
			t.Helper()
			require.NoError(t, repo.CreateScoring(context.Background(), &scoring.Scoring{BoutID: boutID, Points: 1}))
		},
		"update": func(t *testing.T, repo scoring.ScoringRepository, _ *FakeScoringRepository) {
			t.Helper()
			require.NoError(t, repo.UpdateScoring(context.Background(), &scoring.Scoring{ID: 1, BoutID: boutID, Points: 2}))
		},
		"revoke": func(t *testing.T, repo scoring.ScoringRepository, _ *FakeScoringRepository) {
			t.Helper()
			now := time.Now()
			require.NoError(t, repo.RevokeScoring(context.Background(), &scoring.Scoring{ID: 1, BoutID: boutID, RevokedAt: &now}))
		},
	}

	for name, write := range cases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			inner := NewFakeScoringRepository(seeded)
			fakeCache := NewFakeCache()
			repo := scoring.NewCachedScoringRepository(inner, fakeCache)

			_, err := repo.ListScoringHistory(context.Background(), boutID)
			require.NoError(t, err)
			require.True(t, fakeCache.Has("scoring:bout:"+boutID.String()+":history"))

			write(t, repo, inner)

			assert.False(t, fakeCache.Has("scoring:bout:"+boutID.String()+":history"))
		})
	}
}
