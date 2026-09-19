package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/service"
)

func TestRequireRole(t *testing.T) {
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	roleMiddleware := RequireRole(domain.RoleAdmin, domain.RoleOwner)

	t.Run("authorized role succeeds", func(t *testing.T) {
		claims := &service.JWTClaims{
			UserID: "user-1",
			Role:   domain.RoleAdmin,
		}

		req := httptest.NewRequest("GET", "/admin/test", nil)
		ctx := context.WithValue(req.Context(), UserClaimsKey, claims)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		roleMiddleware(dummyHandler).ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rr.Code)
		}
	})

	t.Run("unauthorized role returns 403 Forbidden", func(t *testing.T) {
		claims := &service.JWTClaims{
			UserID: "user-2",
			Role:   domain.RoleResident, // not admin or owner
		}

		req := httptest.NewRequest("GET", "/admin/test", nil)
		ctx := context.WithValue(req.Context(), UserClaimsKey, claims)
		req = req.WithContext(ctx)

		rr := httptest.NewRecorder()
		roleMiddleware(dummyHandler).ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Fatalf("expected status 403, got %d", rr.Code)
		}
	})

	t.Run("missing claims returns 401 Unauthorized", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/admin/test", nil)
		rr := httptest.NewRecorder()
		roleMiddleware(dummyHandler).ServeHTTP(rr, req)

		if rr.Code != http.StatusUnauthorized {
			t.Fatalf("expected status 401, got %d", rr.Code)
		}
	})
}

func TestSiteIsolationMiddleware(t *testing.T) {
	dummyHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	isolation := SiteIsolationMiddleware()

	siteA := "site-aaa"
	siteB := "site-bbb"

	t.Run("owner has access to any site", func(t *testing.T) {
		claims := &service.JWTClaims{
			UserID: "owner-1",
			Role:   domain.RoleOwner,
		}

		r := chi.NewRouter()
		r.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
				ctx := context.WithValue(req.Context(), UserClaimsKey, claims)
				next.ServeHTTP(w, req.WithContext(ctx))
			})
		})
		r.With(isolation).Get("/sites/{siteID}/data", dummyHandler)

		req := httptest.NewRequest("GET", "/sites/"+siteA+"/data", nil)
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Fatalf("expected owner to access site, got %d", rr.Code)
		}
	})

	t.Run("resident cannot access another site", func(t *testing.T) {
		claims := &service.JWTClaims{
			UserID: "resident-1",
			Role:   domain.RoleResident,
			SiteID: &siteA, // resident belongs to siteA
		}

		r := chi.NewRouter()
		r.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
				ctx := context.WithValue(req.Context(), UserClaimsKey, claims)
				next.ServeHTTP(w, req.WithContext(ctx))
			})
		})
		r.With(isolation).Get("/sites/{siteID}/data", dummyHandler)

		// Accessing siteB
		req := httptest.NewRequest("GET", "/sites/"+siteB+"/data", nil)
		rr := httptest.NewRecorder()
		r.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Fatalf("expected 403 Forbidden for cross-site access, got %d", rr.Code)
		}
	})
}
