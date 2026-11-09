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

// Cache is the cache interface, shaped for Redis and intended for data keys to
// have corresponding "*:gen" keys for race-safe generation control
//
// Use `Fetch` instead of `Cache.Load`/`.Save` directly, since it orchestrates
// the generation key for you.
type Cache interface {
	// Load reports what is cached for key, along with the key's generation at
	// the moment of the read.
	Load(ctx context.Context, key string) (Entry, error)
	// Save publishes raw under key, but only if gen is still the key's
	// generation. A mismatch means a write invalidated key since Load read it,
	// so the value in hand is stale and is dropped rather than published. That
	// is an ordinary outcome, not an error.
	Save(ctx context.Context, key string, gen Generation, raw []byte, ttl time.Duration) error
	// Drop invalidates key: it deletes the entry and advances the key's
	// generation in one atomic step, so a read racing between the two can
	// neither serve nor republish the entry it is removing.
	Drop(ctx context.Context, key string) error
}

// Entry is what Load found for a key.
type Entry struct {
	Raw []byte
	Hit bool
	// Gen is the key's generation, to hand back to Save after a miss.
	Gen Generation
}

// Generation identifies a key's invalidation epoch. Callers pass from Load to
// Save and shouldn't care about its internals. The zero value is safe, and used
// to represent a non-existent or expired generation key
type Generation struct {
	// unique token representing this generation, empty means a non-existint or
	// expired generation key
	token string
	valid bool
}

// A TTL for generation keys. Must be longer than the longest possible write,
// so a stale write cannot succeed because the generation expired while it 
// was writing.
const GenerationTTL = time.Hour

// Generates a random generation token. 
// Randomness is used over increments. With increments, Redis could restart
// and begin counting from 0 again, then accidentally match a generation token
// produced before the restart
func newGenerationToken() (string, error) {
	var token [16]byte
	if _, err := rand.Read(token[:]); err != nil {
		return "", fmt.Errorf("generate generation token: %w", err)
	}

	return hex.EncodeToString(token[:]), nil
}

// Fetch returns the value cached under key, calling load on a miss and
// publishing its result for ttl. A write that invalidates key while load is in
// flight discards the fill, so a read can never restore data the write already
// removed.
//
// Cache trouble is never fatal: every failure below is logged and the caller
// still gets load's result. Only load's own error reaches the caller.
func Fetch[T any](
	ctx context.Context,
	c Cache,
	key string,
	ttl time.Duration,
	load func(context.Context) (T, error),
) (T, error) {
	entry, err := c.Load(ctx, key)
	if err != nil {
		slog.Error("read cache key", "key", key, "err", err)
	} else if entry.Hit {
		var cached T
		if err := json.Unmarshal(entry.Raw, &cached); err != nil {
			// An entry that cannot be decoded -- a value written before T
			// changed shape, say -- would otherwise fail every read until its
			// TTL ran out, so drop it instead of waiting.
			slog.Error("unmarshal cache key", "key", key, "err", err)
			if err := c.Drop(ctx, key); err != nil {
				slog.Error("drop undecodable cache key", "key", key, "err", err)
			}

			return load(ctx)
		}

		return cached, nil
	}

	loaded, err := load(ctx)
	if err != nil {
		return loaded, err
	}

	raw, err := json.Marshal(loaded)
	if err != nil {
		slog.Error("marshal cache key", "key", key, "err", err)
		return loaded, nil
	}

	// An unreadable generation leaves entry.Gen zero, which Save treats as a
	// lost race: better to skip the fill than publish behind a write we may
	// not have seen.
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

// Each cached key has a sibling holding its generation, which Drop advances and
// Save checks.
func genKey(key string) string {
	return key + ":gen"
}

func (c *redisCache) Load(ctx context.Context, key string) (Entry, error) {
	pipe := c.client.Pipeline()
	value := pipe.Get(ctx, key)
	generation := pipe.Get(ctx, genKey(key))
	if _, err := pipe.Exec(ctx); err != nil && !errors.Is(err, redis.Nil) {
		return Entry{}, fmt.Errorf("read cache key %s: %w", key, err)
	}

	var entry Entry

	raw, err := value.Bytes()
	switch {
	case errors.Is(err, redis.Nil):
	case err != nil:
		return Entry{}, fmt.Errorf("get cache key %s: %w", key, err)
	default:
		entry.Raw, entry.Hit = raw, true
	}

	token, err := generation.Result()
	if err != nil && !errors.Is(err, redis.Nil) {
		return Entry{}, fmt.Errorf("get generation of cache key %s: %w", key, err)
	}
	entry.Gen = Generation{token: token, valid: true}

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

	// A failed transaction means the generation changed under us, which is the
	// lost race Save exists to detect.
	if errors.Is(err, redis.TxFailedErr) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("set cache key %s at generation %q: %w", key, gen.token, err)
	}

	return nil
}

func (c *redisCache) Drop(ctx context.Context, key string) error {
	token, err := newGenerationToken()
	if err != nil {
		return fmt.Errorf("drop cache key %s: %w", key, err)
	}

	_, err = c.client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.Set(ctx, genKey(key), token, GenerationTTL)
		pipe.Del(ctx, key)
		return nil
	})
	if err != nil {
		return fmt.Errorf("drop cache key %s: %w", key, err)
	}

	return nil
}
