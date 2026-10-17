package middlewares

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"boutline/internal/features/user"

	"github.com/danielgtaylor/huma/v2"
	"github.com/google/uuid"
)

var errMissingBearerToken = errors.New("missing bearer token")

// NewAuthMiddleware requires a valid bearer token on every operation
// requiresAuth selects, and puts the verified user ID on the request context
// for handlers to read with user.UserIDFrom.
func NewAuthMiddleware(api huma.API, tokens *user.UserTokenManager) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		if !requiresAuth(ctx.Operation()) {
			next(ctx)
			return
		}

		userID, err := authenticate(ctx, tokens)
		if err != nil {
			// The reason stays in the log; the client only learns it was rejected.
			slog.Warn("reject request", "err", err, "path", ctx.URL().Path)
			ctx.SetHeader("WWW-Authenticate", "Bearer")
			if err := huma.WriteErr(api, ctx, http.StatusUnauthorized, "unauthorized"); err != nil {
				slog.Error("write unauthorized response", "err", err)
			}
			return
		}

		next(huma.WithContext(ctx, user.WithUserID(ctx.Context(), userID)))
	}
}

// requiresAuth makes reads public and writes protected, so a write route
// someone forgets to mark is still locked. An operation overrides that by
// setting Security: user.UserBearerSecurity() to protect a read, or an empty
// slice to open a write such as login.
func requiresAuth(op *huma.Operation) bool {
	if op.Security != nil {
		return len(op.Security) > 0
	}

	return op.Method != http.MethodGet && op.Method != http.MethodHead
}

func authenticate(ctx huma.Context, tokens *user.UserTokenManager) (uuid.UUID, error) {
	scheme, token, found := strings.Cut(ctx.Header("Authorization"), " ")
	token = strings.TrimSpace(token)
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return uuid.Nil, errMissingBearerToken
	}

	return tokens.ParseToken(token)
}
