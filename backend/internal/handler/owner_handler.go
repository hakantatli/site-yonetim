package handler

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
	"github.com/hakantatli/site-yonetim/internal/service"
)

type OwnerHandler struct {
	siteService service.SiteService
}

func NewOwnerHandler(siteService service.SiteService) *OwnerHandler {
	return &OwnerHandler{siteService: siteService}
}

func (h *OwnerHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Get("/sites", h.ListSites)
	r.Post("/sites", h.CreateSite)
	r.Get("/sites/{id}", h.GetSiteDetails)
	r.Patch("/sites/{id}/limit", h.UpdateLimit)
	r.Post("/sites/{id}/admins", h.CreateAdmin)

	return r
}

func (h *OwnerHandler) ListSites(w http.ResponseWriter, r *http.Request) {
	sites, err := h.siteService.ListSites(r.Context())
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "siteler listelenirken hata oluştu"})
		return
	}
	respondJSON(w, http.StatusOK, sites)
}

func (h *OwnerHandler) CreateSite(w http.ResponseWriter, r *http.Request) {
	var req domain.CreateSiteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	site, err := h.siteService.CreateSite(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidSiteInput) || errors.Is(err, service.ErrInvalidLimit) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, site)
}

func (h *OwnerHandler) GetSiteDetails(w http.ResponseWriter, r *http.Request) {
	siteID := chi.URLParam(r, "id")
	if siteID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "site ID zorunludur"})
		return
	}

	details, err := h.siteService.GetSiteDetails(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "site bulunamadı"})
		return
	}

	respondJSON(w, http.StatusOK, details)
}

func (h *OwnerHandler) UpdateLimit(w http.ResponseWriter, r *http.Request) {
	siteID := chi.URLParam(r, "id")
	if siteID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "site ID zorunludur"})
		return
	}

	var req domain.UpdateLimitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	site, err := h.siteService.UpdateLimit(r.Context(), siteID, req.ApartmentLimit)
	if err != nil {
		if errors.Is(err, service.ErrInvalidLimit) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "limit güncellenemedi"})
		return
	}

	respondJSON(w, http.StatusOK, site)
}

func (h *OwnerHandler) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	siteID := chi.URLParam(r, "id")
	if siteID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "site ID zorunludur"})
		return
	}

	var req domain.CreateAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	admin, err := h.siteService.CreateAdmin(r.Context(), siteID, req)
	if err != nil {
		slog.Error("CreateAdmin failed", "error", err, "site_id", siteID, "phone", req.Phone, "email", req.Email)
		if errors.Is(err, service.ErrAdminPhoneExists) ||
			errors.Is(err, service.ErrAdminEmailExists) ||
			errors.Is(err, service.ErrInvalidAdminInput) ||
			errors.Is(err, repository.ErrSiteNotFound) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, admin)
}
