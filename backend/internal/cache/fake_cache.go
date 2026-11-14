package cache

import (
	"context"
	"sync"
	"time"
)

var _ Cache = (*FakeCache)(nil)

// FakeCache is an in-memory Cache for tests. It keeps the same generation
// bookkeeping as the redis implementation, so a test can exercise a fill that
// loses its race with a write. It lives in this package rather than a test one
// because constructing a Generation is deliberately not possible from outside.
//
// TTLs are ignored, including GenerationTTL: a test that wants an entry gone
// should Drop it.
type FakeCache struct {
	mu          sync.Mutex
	entries     map[string][]byte
	generations map[string]string

	Err error // when set, every method fails with it
}

func NewFakeCache() *FakeCache {
	return &FakeCache{entries: make(map[string][]byte), generations: make(map[string]string)}
}

func (f *FakeCache) Load(_ context.Context, key string) (Entry, error) {
	if f.Err != nil {
		return Entry{}, f.Err
	}

	f.mu.Lock()
	defer f.mu.Unlock()

	raw, hit := f.entries[key]

	return Entry{Raw: raw, Hit: hit, Gen: Generation{token: f.generations[key], valid: true}}, nil
}

func (f *FakeCache) Save(_ context.Context, key string, gen Generation, raw []byte, _ time.Duration) error {
	if f.Err != nil {
		return f.Err
	}

	f.mu.Lock()
	defer f.mu.Unlock()

	if !gen.valid || gen.token != f.generations[key] {
		return nil
	}

	f.entries[key] = raw

	return nil
}

func (f *FakeCache) Drop(_ context.Context, key string) (Generation, error) {
	if f.Err != nil {
		return Generation{}, f.Err
	}

	token, err := newGenerationToken()
	if err != nil {
		return Generation{}, err
	}

	f.mu.Lock()
	defer f.mu.Unlock()

	f.generations[key] = token
	delete(f.entries, key)

	return Generation{token: token, valid: true}, nil
}

// Has reports whether key currently holds an entry.
func (f *FakeCache) Has(key string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()

	_, ok := f.entries[key]

	return ok
}
