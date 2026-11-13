package cache

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// Data key/value pairs have associated "generation" key/value pairs for
// handling race conditions.
//
// Conceptually, "generation" tracks the version of the *database* data,
// not the cache data. The process for data modification looks like
//  (a) modify data in the database as desired
//  (b) invalidate the current (stale) cache
//  (c) update the generation token so no out-of-date data can be written back into the cache
// The `Cache.Drop` method below handles both (b) and (c)
//
// And for fetching data
//  (a) read from the cache; if valid, use that data
//  (b) otherwise, read new data from the database
//  (c) write new data into cache *unless* generation has changed since (a)
// The `Fetch` function below handles (a),(b),(c)

// Interface for caching with Redis
type Cache interface {
	// Loads key and generation simultaneously
	Load(ctx context.Context, key string) (Entry, error)
	// Saves a new value to the key only if current generation matches the provided one
	// Generation mismatch is not an error, but no write happens
	Save(ctx context.Context, key string, gen Generation, raw []byte, ttl time.Duration) error
	// Invalidates a key and updates its generation to a new random token
	Drop(ctx context.Context, key string) (Generation, error)
}

// `Cache.Load` simultaneously returns data and a generation token
type Entry struct {
	Raw []byte
	Hit bool
	Gen Generation
}

type Generation struct {
	token string // empty when the generation key doesn't exist or has expired
	valid bool   // true on cache hit or miss, false only on genuine error
}

// A TTL for generation keys. Generation keys must outlast the longest possible write.
const GenerationTTL = time.Hour

// Generates a random generation token.
func newGenerationToken() (string, error) {
	var token [16]byte

	// Randomness is used over increments. With increments, Redis could restart
	// and begin counting from 0 again, then accidentally match a generation token
	// produced before the restart
	if _, err := rand.Read(token[:]); err != nil {
		return "", fmt.Errorf("generate generation token: %w", err)
	}

	return hex.EncodeToString(token[:]), nil
}

// Fetch returns the cached value, or on a cache miss calls the `load` fallback
// and uses that to populate the cache
//
// Cache failures are logged, not fatal
func Fetch[T any](
	ctx context.Context,
	c Cache,
	key string,
	ttl time.Duration,
	load func(context.Context) (T, error),
) (T, error) {
	// Load from cache
	entry, err := c.Load(ctx, key)
	if err != nil {
		slog.Error("read cache key", "key", key, "err", err)
	} else if entry.Hit {
		var cached T
		if err := json.Unmarshal(entry.Raw, &cached); err != nil {
			slog.Error("unmarshal cache key", "key", key, "err", err)

			// Drop the invalid cache item
			gen, dropErr := c.Drop(ctx, key)
			if dropErr != nil {
				slog.Error("drop undecodable cache key", "key", key, "err", dropErr)
				return load(ctx)
			}
			entry.Gen = gen
		} else {
			// Return cached value if successful
			return cached, nil
		}
	}

	// Load using fallback
	loaded, err := load(ctx)
	if err != nil {
		return loaded, err
	}

	// Serialize and save back into cache
	raw, err := json.Marshal(loaded)
	if err != nil {
		slog.Error("marshal cache key", "key", key, "err", err)
		return loaded, nil
	}

	if err := c.Save(ctx, key, entry.Gen, raw, ttl); err != nil {
		slog.Error("write cache key", "key", key, "err", err)
	}

	return loaded, nil
}

var _ Cache = (*redisCache)(nil)

type redisCache struct {
	client *redis.Client
}

func NewRedisCache(client *redis.Client) Cache {
	return &redisCache{client: client}
}

// Each key for storing data has a generation key
func genKey(key string) string {
	return key + ":gen"
}

func (c *redisCache) Load(ctx context.Context, key string) (Entry, error) {
	// Pipelined so both Gets happen in one pipe.Exec call
	pipe := c.client.Pipeline()
	value := pipe.Get(ctx, key)
	generation := pipe.Get(ctx, genKey(key))
	if _, err := pipe.Exec(ctx); err != nil && !errors.Is(err, redis.Nil) {
		return Entry{}, fmt.Errorf("read cache key %s: %w", key, err)
	}

	raw, rawErr := value.Bytes()
	token, tokenErr := generation.Result()

	missedRaw := errors.Is(rawErr, redis.Nil)
	missedToken := errors.Is(tokenErr, redis.Nil)

	if rawErr != nil && !missedRaw {
		return Entry{}, fmt.Errorf("get cache key %s: %w", key, rawErr)
	}
	if tokenErr != nil && !missedToken {
		return Entry{}, fmt.Errorf("get generation of cache key %s: %w", key, tokenErr)
	}

	var entry Entry

	if !missedRaw {
		entry.Raw = raw
		entry.Hit = true
	}

	// Gen is valid even for cache miss
	// only false for genuine error
	entry.Gen.valid = true
	if !missedToken {
		entry.Gen.token = token
	}

	return entry, nil
}

func (c *redisCache) Save(ctx context.Context, key string, gen Generation, raw []byte, ttl time.Duration) error {
	if !gen.valid {
		return nil
	}

	watched := genKey(key)
	err := c.client.Watch(ctx, func(tx *redis.Tx) error {
		current, err := tx.Get(ctx, watched).Result()
		if err != nil && !errors.Is(err, redis.Nil) {
			return err
		}
		if current != gen.token {
			return nil
		}

		_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Set(ctx, key, raw, ttl)
			return nil
		})

		return err
	}, watched)

	// TxFailedErr means the watched key (generation) changed
	if errors.Is(err, redis.TxFailedErr) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("set cache key %s at generation %q: %w", key, gen.token, err)
	}

	return nil
}

func (c *redisCache) Drop(ctx context.Context, key string) (Generation, error) {
	token, err := newGenerationToken()
	if err != nil {
		return Generation{}, fmt.Errorf("drop cache key %s: %w", key, err)
	}

	_, err = c.client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.Set(ctx, genKey(key), token, GenerationTTL)
		pipe.Del(ctx, key)
		return nil
	})
	if err != nil {
		return Generation{}, fmt.Errorf("drop cache key %s: %w", key, err)
	}

	return Generation{token: token, valid: true}, nil
}
