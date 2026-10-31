package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache is the seam features depend on instead of *redis.Client directly, so a
// feature's cache-aside logic can be tested against a fake with no real Redis.
type Cache interface {
	// Get reports false, with no error, on a cache miss.
	Get(ctx context.Context, key string, dest any) (bool, error)
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	Del(ctx context.Context, key string) error
	// Incr atomically increments key (starting from 0) and returns the new value.
	Incr(ctx context.Context, key string) (int64, error)
	// SetIfUnchanged sets key only if versionKey still holds wantVersion, so a
	// value fetched before a concurrent invalidation can't overwrite it after
	// the fact. A version mismatch is a lost race, not an error.
	SetIfUnchanged(ctx context.Context, key, versionKey string, wantVersion int64, value any, ttl time.Duration) error
}

type redisCache struct {
	client *redis.Client
}

func NewRedisCache(client *redis.Client) Cache {
	return &redisCache{client: client}
}

func (c *redisCache) Get(ctx context.Context, key string, dest any) (bool, error) {
	raw, err := c.client.Get(ctx, key).Bytes()
	if errors.Is(err, redis.Nil) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("get cache key %s: %w", key, err)
	}

	if err := json.Unmarshal(raw, dest); err != nil {
		return false, fmt.Errorf("unmarshal cache key %s: %w", key, err)
	}

	return true, nil
}

func (c *redisCache) Set(ctx context.Context, key string, value any, ttl time.Duration) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache key %s: %w", key, err)
	}

	if err := c.client.Set(ctx, key, raw, ttl).Err(); err != nil {
		return fmt.Errorf("set cache key %s: %w", key, err)
	}

	return nil
}

func (c *redisCache) Del(ctx context.Context, key string) error {
	if err := c.client.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("delete cache key %s: %w", key, err)
	}

	return nil
}

func (c *redisCache) Incr(ctx context.Context, key string) (int64, error) {
	n, err := c.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("increment cache key %s: %w", key, err)
	}

	return n, nil
}

func (c *redisCache) SetIfUnchanged(
	ctx context.Context,
	key, versionKey string,
	wantVersion int64,
	value any,
	ttl time.Duration,
) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("marshal cache key %s: %w", key, err)
	}

	err = c.client.Watch(ctx, func(tx *redis.Tx) error {
		version, err := tx.Get(ctx, versionKey).Int64()
		if err != nil && !errors.Is(err, redis.Nil) {
			return err
		}
		if version != wantVersion {
			return nil
		}

		_, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Set(ctx, key, raw, ttl)
			return nil
		})

		return err
	}, versionKey)

	if errors.Is(err, redis.TxFailedErr) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("set cache key %s if version key %s is still %d: %w", key, versionKey, wantVersion, err)
	}

	return nil
}
