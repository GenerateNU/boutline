package cache

import (
	"context"
	"fmt"

	"boutline/internal/config"

	"github.com/redis/go-redis/v9"
)

// Connect opens the client and verifies it. redis.NewClient is lazy, so
// without the ping a bad host or password would only surface on the first
// request.
func Connect(ctx context.Context, cfg config.RedisConfig) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.Addr(),
		Password: cfg.Password,
		DB:       cfg.DB,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return client, nil
}

func Close(client *redis.Client) error {
	if err := client.Close(); err != nil {
		return fmt.Errorf("close redis: %w", err)
	}

	return nil
}
