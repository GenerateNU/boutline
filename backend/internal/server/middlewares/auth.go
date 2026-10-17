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

// NewAuthMiddleware requires a valid bearer token on every operation except
// the public ones below, and puts the verified user ID on the request context
// for handlers to read with user.UserIDFrom.
func NewAuthMiddleware(api huma.API, tokens *user.UserTokenManager) func(huma.Context, func(huma.Context)) {
	return func(ctx huma.Context, next func(huma.Context)) {
		switch ctx.Operation().OperationID {
		case "healthcheck", "signup", "login":
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

func authenticate(ctx huma.Context, tokens *user.UserTokenManager) (uuid.UUID, error) {
	scheme, token, found := strings.Cut(ctx.Header("Authorization"), " ")
	token = strings.TrimSpace(token)
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return uuid.Nil, errMissingBearerToken
	}

	return tokens.ParseToken(token)
}
