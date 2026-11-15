package middlewares

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"boutline/internal/features/user"
	"boutline/internal/session"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

var (
	errMissingBearerToken = errors.New("missing bearer token")
	errUserNotFound       = errors.New("token user no longer exists")
	errLookupFailed       = errors.New("look up token user")
)

// UserLookup is how the middleware checks that a token's user still exists.
type UserLookup interface {
	UserExists(ctx context.Context, id uuid.UUID) (bool, error)
}

// NewAuthMiddleware requires a valid bearer token, for a user that still
// exists, on every operation requiresAuth selects, and puts the verified user
// ID on the request context for handlers to read with session.UserIDFrom. A
// public operation still reads a token when one is sent, so it can show
// signed-in callers more; a bad token or a missing user there just leaves the
// request anonymous. A failed user lookup is a 500 on every operation, never a
// 401, so an outage cannot look like a signed-out session, and a public read
// cannot quietly answer a signed-in caller with the anonymous view.
func NewAuthMiddleware(
	api huma.API,
	tokens *user.UserTokenManager,
	users UserLookup,
) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		userID, err := authenticate(ctx, tokens, users)

		if !requiresAuth(ctx.Operation()) && !errors.Is(err, errLookupFailed) {
			if err == nil {
				ctx = huma.WithContext(ctx, session.WithUserID(ctx.Context(), userID))
			}
			next(ctx)
			return
		}

		if err != nil {
			rejectRequest(api, ctx, err)
			return
		}

		next(huma.WithContext(ctx, session.WithUserID(ctx.Context(), userID)))
	}
}

func rejectRequest(api huma.API, ctx huma.Context, cause error) {
	status, detail := http.StatusUnauthorized, "unauthorized"
	if errors.Is(cause, errLookupFailed) {
		status, detail = http.StatusInternalServerError, "internal server error"
		slog.Error("reject request", "err", cause, "path", ctx.URL().Path)
	} else {
		// The reason stays in the log; the client only learns it was rejected.
		slog.Warn("reject request", "err", cause, "path", ctx.URL().Path)
		ctx.SetHeader("WWW-Authenticate", "Bearer")
	}

	if err := huma.WriteErr(api, ctx, status, detail); err != nil {
		slog.Error("write rejection response", "err", err)
	}
}

// ApplyDefaultSecurity runs as an OpenAPI OnAddOperation hook, so every
// documented operation leaves registration with an explicit Security: reads
// public, writes behind a bearer token. An operation that set its own Security
// (user.UserBearerSecurity() on a read, an empty slice on login) keeps it. The
// generated spec and the middleware then read the same value.
func ApplyDefaultSecurity(_ *huma.OpenAPI, op *huma.Operation) {
	if op.Security != nil {
		return
	}
	if op.Method == http.MethodGet || op.Method == http.MethodHead {
		op.Security = []map[string][]string{}
		return
	}
	op.Security = user.UserBearerSecurity()
}

// Security is still nil only for an operation the hook never saw (one
// registered with Hidden: true), and that fails closed rather than open.
func requiresAuth(op *huma.Operation) bool {
	return op.Security == nil || len(op.Security) > 0
}

// authenticate parses the token before looking the user up, so a bad token
// never costs a database round trip.
func authenticate(ctx huma.Context, tokens *user.UserTokenManager, users UserLookup) (uuid.UUID, error) {
	scheme, token, found := strings.Cut(ctx.Header("Authorization"), " ")
	token = strings.TrimSpace(token)
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return uuid.Nil, errMissingBearerToken
	}

	userID, err := tokens.ParseToken(token)
	if err != nil {
		return uuid.Nil, err
	}

	exists, err := users.UserExists(ctx.Context(), userID)
	if err != nil {
		return uuid.Nil, fmt.Errorf("%w: %w", errLookupFailed, err)
	}
	if !exists {
		return uuid.Nil, errUserNotFound
	}

	return userID, nil
}
