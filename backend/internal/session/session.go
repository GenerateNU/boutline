// Package session carries the caller the auth middleware verified. It imports
// no feature, so any feature can read the caller without an import cycle.
package session

import (
	"context"

	"github.com/google/uuid"
)

type userIDKey struct{}

func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey{}, id)
}

// UserIDFrom returns the caller the auth middleware verified for this request.
func UserIDFrom(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey{}).(uuid.UUID)
	return id, ok
}

// BearerScheme is the OpenAPI security scheme server.CreateApp registers.
const BearerScheme = "bearer"

// BearerSecurity marks a read operation as needing a bearer token; writes
// need one already unless they opt out with an empty Security.
func BearerSecurity() []map[string][]string {
	return []map[string][]string{{BearerScheme: {}}}
}
