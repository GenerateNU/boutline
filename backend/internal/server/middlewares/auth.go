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

func authenticate(ctx huma.Context, tokens *user.UserTokenManager) (uuid.UUID, error) {
	scheme, token, found := strings.Cut(ctx.Header("Authorization"), " ")
	token = strings.TrimSpace(token)
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return uuid.Nil, errMissingBearerToken
	}

	return tokens.ParseToken(token)
}
