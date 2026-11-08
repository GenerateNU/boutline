package tests

import (
	"context"
	"testing"
	"time"

	"boutline/internal/cache"
	"boutline/internal/tests/testkit"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const entryTTL = time.Minute

// Covers the redis cache's generation guard against a real Redis. The FakeCache
// tests exercise the same protocol, but only the real implementation runs the
// WATCH/MULTI optimistic lock that makes Save conditional, and only Redis
// expires a generation key.
func TestRedisCacheGenerationGuard(t *testing.T) {
	_, redisClient, _ := testkit.GetDBAndCacheTestApp(t)

	c := cache.NewRedisCache(redisClient)
	ctx := t.Context()

	// A fresh key per run, so concurrent runs against a shared Redis cannot
	// see each other's generations.
	key := "test:cache:" + uuid.NewString()
	// t.Context is cancelled before cleanups run, so cleanup needs a context
	// that outlives it.
	cleanupCtx := context.WithoutCancel(ctx)
	t.Cleanup(func() {
		if err := redisClient.Del(cleanupCtx, key, key+":gen").Err(); err != nil {
			t.Errorf("cleanup: delete keys for %s: %v", key, err)
		}
	})

	entry, err := c.Load(ctx, key)
	require.NoError(t, err)
	require.False(t, entry.Hit)

	require.NoError(t, c.Save(ctx, key, entry.Gen, []byte(`"first"`), entryTTL))

	entry, err = c.Load(ctx, key)
	require.NoError(t, err)
	require.True(t, entry.Hit)
	assert.JSONEq(t, `"first"`, string(entry.Raw))

	// Hold the generation this read saw, then invalidate: the held generation
	// must no longer be publishable.
	stale := entry.Gen
	require.NoError(t, c.Drop(ctx, key))

	entry, err = c.Load(ctx, key)
	require.NoError(t, err)
	require.False(t, entry.Hit, "Drop should have deleted the entry")

	require.NoError(t, c.Save(ctx, key, stale, []byte(`"stale"`), entryTTL),
		"losing the race is an ordinary outcome, not an error")

	entry, err = c.Load(ctx, key)
	require.NoError(t, err)
	assert.False(t, entry.Hit, "a fill holding a pre-Drop generation must not republish")

	// The generation the Drop wrote is publishable, and bounded.
	require.NoError(t, c.Save(ctx, key, entry.Gen, []byte(`"second"`), entryTTL))

	entry, err = c.Load(ctx, key)
	require.NoError(t, err)
	require.True(t, entry.Hit)
	assert.JSONEq(t, `"second"`, string(entry.Raw))

	genTTL, err := redisClient.TTL(ctx, key+":gen").Result()
	require.NoError(t, err)
	assert.Positive(t, genTTL, "an invalidated key's generation must expire rather than accumulate")
	assert.LessOrEqual(t, genTTL, cache.GenerationTTL)
	assert.Greater(t, genTTL, entryTTL, "the generation must outlive the entries it guards")
}
