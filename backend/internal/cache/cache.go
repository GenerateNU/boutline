package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache interface, currently only implemented for Redis and as a mock
type Cache interface {
	// Get reports false, with no error, on a cache miss.
	Get(ctx context.Context, key string, dest any) (bool, error)
	Set(ctx context.Context, key string, value any, ttl time.Duration) error
	// Could add plain `Del` later if `IncrAndDel` doesn't fit
	// Incr atomically increments key (starting from 0) and returns the new value.
	Incr(ctx context.Context, key string) (int64, error)
	// Atomically increment versionKey and deletes key, to avoid races
	IncrAndDel(ctx context.Context, versionKey, key string) error
	// Atomically update key only if versionKey is as expected. Returns false
	// but does not error for a versionKey mismatch (assumed to be a lost race
	// but not an error)
	SetIfUnchanged(ctx context.Context, key, versionKey string, wantVersion int64, value any, ttl time.Duration) (bool, error)
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

func (c *redisCache) Incr(ctx context.Context, key string) (int64, error) {
	n, err := c.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, fmt.Errorf("increment cache key %s: %w", key, err)
	}

	return n, nil
}

func (c *redisCache) IncrAndDel(ctx context.Context, versionKey, key string) error {
	_, err := c.client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.Incr(ctx, versionKey)
		pipe.Del(ctx, key)
		return nil
	})
	if err != nil {
		return fmt.Errorf("increment version key %s and delete cache key %s: %w", versionKey, key, err)
	}

	return nil
}

func (c *redisCache) SetIfUnchanged(
	ctx context.Context,
	key, versionKey string,
	wantVersion int64,
	value any,
	ttl time.Duration,
) (bool, error) {
	raw, err := json.Marshal(value)
	if err != nil {
		return false, fmt.Errorf("marshal cache key %s: %w", key, err)
	}

	set := false
	err = c.client.Watch(ctx, func(tx *redis.Tx) error {
		version, err := tx.Get(ctx, versionKey).Int64()
		if err != nil && !errors.Is(err, redis.Nil) {
			return err
		}
		if version != wantVersion {
			return nil
		}

		if _, err := tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
			pipe.Set(ctx, key, raw, ttl)
			return nil
		}); err != nil {
			return err
		}

		set = true

		return nil
	}, versionKey)

	if errors.Is(err, redis.TxFailedErr) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("set cache key %s if version key %s is still %d: %w", key, versionKey, wantVersion, err)
	}

	return set, nil
}
