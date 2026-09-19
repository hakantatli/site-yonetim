package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/service"
)

type contextKey string

const (
	UserClaimsKey contextKey = "user_claims"
)

func AuthMiddleware(authService service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"error":"authorization header required"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				http.Error(w, `{"error":"authorization header format must be Bearer {token}"}`, http.StatusUnauthorized)
				return
			}

			claims, err := authService.ValidateToken(parts[1])
			if err != nil {
				http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), UserClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(roles ...domain.UserRole) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaims(r.Context())
			if !ok {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			for _, role := range roles {
				if claims.Role == role {
					next.ServeHTTP(w, r)
					return
				}
			}

			http.Error(w, `{"error":"forbidden: insufficient permissions"}`, http.StatusForbidden)
		})
	}
}

func SiteIsolationMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaims(r.Context())
			if !ok {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			// Owner has access to all sites
			if claims.Role == domain.RoleOwner {
				next.ServeHTTP(w, r)
				return
			}

			// For Admin and Resident: check siteID from URL param
			urlSiteID := chi.URLParam(r, "siteID")
			if urlSiteID != "" {
				if claims.SiteID == nil || *claims.SiteID != urlSiteID {
					http.Error(w, `{"error":"forbidden: cross-site access prohibited"}`, http.StatusForbidden)
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetClaims(ctx context.Context) (*service.JWTClaims, bool) {
	claims, ok := ctx.Value(UserClaimsKey).(*service.JWTClaims)
	return claims, ok
}
