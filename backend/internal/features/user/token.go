package user

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	UserTokenTTL = 24 * time.Hour
	// UserBearerScheme is the OpenAPI security scheme server.CreateApp registers.
	UserBearerScheme = "bearer"
)

// UserBearerSecurity marks a read operation as needing a bearer token; writes
// need one already unless they opt out with an empty Security.
func UserBearerSecurity() []map[string][]string {
	return []map[string][]string{{UserBearerScheme: {}}}
}

// UserTokenManager issues the bearer tokens signup and login hand out, and
// verifies the ones the auth middleware receives.
type UserTokenManager struct {
	secret []byte
	ttl    time.Duration
}

func NewUserTokenManager(secret string, ttl time.Duration) *UserTokenManager {
	return &UserTokenManager{secret: []byte(secret), ttl: ttl}
}

func (m *UserTokenManager) IssueToken(userID uuid.UUID) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{
		Subject:   userID.String(),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
	}

	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}

	return signed, nil
}

// ParseToken accepts HS256 only, so a token claiming "none" or another
// algorithm is rejected rather than verified with the wrong scheme.
func (m *UserTokenManager) ParseToken(raw string) (uuid.UUID, error) {
	var claims jwt.RegisteredClaims
	_, err := jwt.ParseWithClaims(raw, &claims, func(*jwt.Token) (any, error) {
		return m.secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}), jwt.WithExpirationRequired())
	if err != nil {
		return uuid.Nil, fmt.Errorf("parse token: %w", err)
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return uuid.Nil, fmt.Errorf("parse token subject: %w", err)
	}

	return userID, nil
}

type userIDKey struct{}

func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey{}, id)
}

// UserIDFrom returns the caller the auth middleware verified for this request.
func UserIDFrom(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey{}).(uuid.UUID)
	return id, ok
}
