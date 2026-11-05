package test

import (
	"context"
	"encoding/json"
	"time"

	"boutline/internal/cache"
)

var _ cache.Cache = (*FakeCache)(nil)

// FakeCache round-trips values through JSON, same as the real redis-backed
// cache, so a test catches a type that fails to marshal or unmarshal.
type FakeCache struct {
	entries  map[string][]byte
	versions map[string]int64
	Err      error // when set, every method fails with it
}

func NewFakeCache() *FakeCache {
	return &FakeCache{entries: make(map[string][]byte), versions: make(map[string]int64)}
}

func (f *FakeCache) Get(_ context.Context, key string, dest any) (bool, error) {
	if f.Err != nil {
		return false, f.Err
	}

	raw, ok := f.entries[key]
	if !ok {
		return false, nil
	}

	return true, json.Unmarshal(raw, dest)
}

func (f *FakeCache) Set(_ context.Context, key string, value any, _ time.Duration) error {
	if f.Err != nil {
		return f.Err
	}

	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}

	f.entries[key] = raw

	return nil
}

func (f *FakeCache) Incr(_ context.Context, key string) (int64, error) {
	if f.Err != nil {
		return 0, f.Err
	}

	f.versions[key]++

	return f.versions[key], nil
}

func (f *FakeCache) IncrAndDel(_ context.Context, versionKey, key string) error {
	if f.Err != nil {
		return f.Err
	}

	f.versions[versionKey]++
	delete(f.entries, key)

	return nil
}

func (f *FakeCache) SetIfUnchanged(_ context.Context, key, versionKey string, wantVersion int64, value any, _ time.Duration) (bool, error) {
	if f.Err != nil {
		return false, f.Err
	}

	if f.versions[versionKey] != wantVersion {
		return false, nil
	}

	raw, err := json.Marshal(value)
	if err != nil {
		return false, err
	}

	f.entries[key] = raw

	return true, nil
}

func (f *FakeCache) Has(key string) bool {
	_, ok := f.entries[key]
	return ok
}
