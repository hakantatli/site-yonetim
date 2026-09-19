package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/middleware"
	"github.com/hakantatli/site-yonetim/internal/service"
)

type AuthHandler struct {
	authService service.AuthService
	rateLimiter *middleware.RateLimiter
}

func NewAuthHandler(authService service.AuthService, rateLimiter *middleware.RateLimiter) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		rateLimiter: rateLimiter,
	}
}

func (h *AuthHandler) Routes() chi.Router {
	r := chi.NewRouter()

	if h.rateLimiter != nil {
		r.With(h.rateLimiter.Limit).Post("/login", h.Login)
	} else {
		r.Post("/login", h.Login)
	}
	r.Post("/refresh", h.Refresh)
	r.Post("/logout", h.Logout)

	r.Group(func(protected chi.Router) {
		protected.Use(middleware.AuthMiddleware(h.authService))
		protected.Get("/me", h.Me)
	})

	return r
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req domain.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	identifier := req.GetIdentifier()
	if identifier == "" || req.Password == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "telefon numarası ve şifre zorunludur"})
		return
	}

	tokenPair, err := h.authService.Login(r.Context(), identifier, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "geçersiz telefon / e-posta veya şifre"})
			return
		}
		if errors.Is(err, service.ErrUserInactive) {
			respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcı hesabı pasif durumda"})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "giriş yapılırken bir hata oluştu"})
		return
	}

	respondJSON(w, http.StatusOK, tokenPair)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	if req.RefreshToken == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "refresh_token zorunludur"})
		return
	}

	tokenPair, err := h.authService.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "geçersiz veya süresi dolmuş oturum"})
		return
	}

	respondJSON(w, http.StatusOK, tokenPair)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req domain.RefreshRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.RefreshToken != "" {
		_ = h.authService.Logout(r.Context(), req.RefreshToken)
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "başarıyla çıkış yapıldı"})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"user_id": claims.UserID,
		"phone":   claims.Phone,
		"email":   claims.Email,
		"role":    claims.Role,
		"site_id": claims.SiteID,
	})
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}
