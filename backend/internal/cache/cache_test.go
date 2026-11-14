package cache_test

import (
	"context"
	"testing"
	"time"

	"boutline/internal/cache"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	testKey = "test:key"
	testTTL = time.Minute
)

type payload struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// loadsOnce returns a loader yielding value, and a counter of how many times it
// was called, so a test can tell a hit from a miss by observable effect.
func loadsOnce(value payload) (func(context.Context) (payload, error), *int) {
	calls := 0

	return func(context.Context) (payload, error) {
		calls++
		return value, nil
	}, &calls
}

func TestFetch(t *testing.T) {
	t.Parallel()

	want := payload{Name: "riposte", Count: 3}

	t.Run("a miss loads, publishes, and the next fetch is served from cache", func(t *testing.T) {
		t.Parallel()

		fakeCache := cache.NewFakeCache()
		current := want
		load := func(context.Context) (payload, error) { return current, nil }

		got, err := cache.Fetch(t.Context(), fakeCache, testKey, testTTL, load)
		require.NoError(t, err)
		assert.Equal(t, want, got)
		require.True(t, fakeCache.Has(testKey))

		// If the second fetch reached the loader rather than the cache, it
		// would observe this changed value instead of the cached one.
		current = payload{Name: "fleche", Count: 7}

		got, err = cache.Fetch(t.Context(), fakeCache, testKey, testTTL, load)
		require.NoError(t, err)
		assert.Equal(t, want, got, "the second fetch should have been served from cache")
	})

	t.Run("a dropped key is loaded again", func(t *testing.T) {
		t.Parallel()

		fakeCache := cache.NewFakeCache()
		current := want
		load := func(context.Context) (payload, error) { return current, nil }

		got, err := cache.Fetch(t.Context(), fakeCache, testKey, testTTL, load)
		require.NoError(t, err)
		assert.Equal(t, want, got)

		_, err = fakeCache.Drop(t.Context(), testKey)
		require.NoError(t, err)
		assert.False(t, fakeCache.Has(testKey))

		other := payload{Name: "fleche", Count: 7}
		current = other

		got, err = cache.Fetch(t.Context(), fakeCache, testKey, testTTL, load)
		require.NoError(t, err)
		assert.Equal(t, other, got, "a fetch after drop should reload rather than serve the old value")
	})

	t.Run("a loader error reaches the caller and nothing is published", func(t *testing.T) {
		t.Parallel()

		fakeCache := cache.NewFakeCache()

		_, err := cache.Fetch(t.Context(), fakeCache, testKey, testTTL,
			func(context.Context) (payload, error) { return payload{}, assert.AnError })
		require.ErrorIs(t, err, assert.AnError)
		assert.False(t, fakeCache.Has(testKey))
	})

	t.Run("an unusable cache still serves the loader's result", func(t *testing.T) {
		t.Parallel()

		fakeCache := cache.NewFakeCache()
		fakeCache.Err = assert.AnError
		load, calls := loadsOnce(want)

		got, err := cache.Fetch(t.Context(), fakeCache, testKey, testTTL, load)
		require.NoError(t, err, "cache trouble must not fail the caller's read")
		assert.Equal(t, want, got)
		assert.Equal(t, 1, *calls)

		fakeCache.Err = nil
		assert.False(t, fakeCache.Has(testKey), "a fill whose generation could not be read must not publish")
	})

	t.Run("a drop landing while the loader runs discards the fill", func(t *testing.T) {
		t.Parallel()

		fakeCache := cache.NewFakeCache()

		// The loader has its result in hand, then a write invalidates the key
		// before the fill reaches the cache -- the race the generation guards.
		got, err := cache.Fetch(t.Context(), fakeCache, testKey, testTTL,
			func(ctx context.Context) (payload, error) {
				_, err := fakeCache.Drop(ctx, testKey)
				return want, err
			})
		require.NoError(t, err)
		assert.Equal(t, want, got, "the caller still gets the snapshot it loaded")
		assert.False(t, fakeCache.Has(testKey), "the stale snapshot must not be published")
	})

	t.Run("an undecodable entry is dropped and refilled rather than failing reads until its ttl", func(t *testing.T) {
		t.Parallel()

		fakeCache := cache.NewFakeCache()

		// Publish a string, then read the same key as a payload: the shape
		// change a schema edit would cause.
		_, err := cache.Fetch(t.Context(), fakeCache, testKey, testTTL,
			func(context.Context) (string, error) { return "parry", nil })
		require.NoError(t, err)
		require.True(t, fakeCache.Has(testKey))

		load, calls := loadsOnce(want)
		got, err := cache.Fetch(t.Context(), fakeCache, testKey, testTTL, load)
		require.NoError(t, err)
		assert.Equal(t, want, got)
		assert.Equal(t, 1, *calls)

		// If the refill under the new generation didn't take, this would
		// reach the loader again instead of being served from cache.
		got, err = cache.Fetch(t.Context(), fakeCache, testKey, testTTL, load)
		require.NoError(t, err)
		assert.Equal(t, want, got)
		assert.Equal(t, 1, *calls, "the refill after the decode failure should have been published")
	})
}
