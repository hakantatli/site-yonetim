package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/middleware"
	"github.com/hakantatli/site-yonetim/internal/service"
)

type ResidentHandler struct {
	apartmentService    service.ApartmentService
	expenseService      service.ExpenseService
	meterService        service.MeterService
	announcementService service.AnnouncementService
	dueService          service.DueService
	paymentService      service.PaymentService
}

func NewResidentHandler(
	apartmentService service.ApartmentService,
	expenseService service.ExpenseService,
	meterService service.MeterService,
	announcementService service.AnnouncementService,
	dueService service.DueService,
	paymentService service.PaymentService,
) *ResidentHandler {
	return &ResidentHandler{
		apartmentService:    apartmentService,
		expenseService:      expenseService,
		meterService:        meterService,
		announcementService: announcementService,
		dueService:          dueService,
		paymentService:      paymentService,
	}
}

func (h *ResidentHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Resident apartments (for profile/view switching and multi-apartment support)
	r.Get("/me/apartments", h.ListMyApartments)

	// Treasury / Transparent Cashflow for residents
	r.Get("/treasury", h.GetTreasurySummary)

	// Meters history for resident
	r.Get("/meters/history", h.GetResidentMeterHistory)

	// Announcements for resident
	r.Get("/announcements", h.ListAnnouncements)

	// Debts & Payments for resident
	r.Get("/me/debts", h.ListMyDebts)
	r.Get("/me/payments", h.ListMyPayments)

	return r
}

func (h *ResidentHandler) resolveSiteID(r *http.Request) (string, *service.JWTClaims, bool) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		return "", nil, false
	}

	querySiteID := r.URL.Query().Get("site_id")
	if querySiteID != "" {
		if claims.Role == domain.RoleOwner {
			return querySiteID, claims, true
		}
		if claims.SiteID != nil && *claims.SiteID == querySiteID {
			return querySiteID, claims, true
		}
		apts, err := h.apartmentService.ListUserApartments(r.Context(), claims.UserID)
		if err == nil {
			for _, a := range apts {
				if a.SiteID == querySiteID {
					return querySiteID, claims, true
				}
			}
		}
	}

	if claims.SiteID != nil && *claims.SiteID != "" {
		return *claims.SiteID, claims, true
	}

	apts, err := h.apartmentService.ListUserApartments(r.Context(), claims.UserID)
	if err == nil && len(apts) > 0 {
		return apts[0].SiteID, claims, true
	}

	return "", claims, false
}

func (h *ResidentHandler) ListMyApartments(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "oturum doğrulanamadı"})
		return
	}

	apartments, err := h.apartmentService.ListUserApartments(r.Context(), claims.UserID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, apartments)
}

func (h *ResidentHandler) ListMyDebts(w http.ResponseWriter, r *http.Request) {
	siteID, claims, ok := h.resolveSiteID(r)
	if !ok || siteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site veya daire bulunamadı"})
		return
	}

	filter := domain.DebtFilter{
		DebtorUserID: &claims.UserID,
	}

	debts, err := h.dueService.ListDebts(r.Context(), siteID, filter)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, debts)
}

func (h *ResidentHandler) ListMyPayments(w http.ResponseWriter, r *http.Request) {
	siteID, claims, ok := h.resolveSiteID(r)
	if !ok || siteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site veya daire bulunamadı"})
		return
	}

	filter := domain.PaymentFilter{
		DebtorUserID: &claims.UserID,
	}

	payments, err := h.paymentService.ListPayments(r.Context(), siteID, filter)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, payments)
}

func (h *ResidentHandler) GetTreasurySummary(w http.ResponseWriter, r *http.Request) {
	siteID, _, ok := h.resolveSiteID(r)
	if !ok || siteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site veya daire bulunamadı"})
		return
	}

	summary, err := h.expenseService.GetTreasurySummary(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, summary)
}

func (h *ResidentHandler) GetResidentMeterHistory(w http.ResponseWriter, r *http.Request) {
	siteID, claims, ok := h.resolveSiteID(r)
	if !ok || siteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site veya daire bulunamadı"})
		return
	}

	history, err := h.meterService.GetResidentMeterHistory(r.Context(), claims.UserID, siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, history)
}

func (h *ResidentHandler) ListAnnouncements(w http.ResponseWriter, r *http.Request) {
	siteID, _, ok := h.resolveSiteID(r)
	if !ok || siteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site veya daire bulunamadı"})
		return
	}

	announcements, err := h.announcementService.ListAnnouncements(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, announcements)
}

