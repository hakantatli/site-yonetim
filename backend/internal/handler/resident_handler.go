package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/middleware"
	"github.com/hakantatli/site-yonetim/internal/service"
)

type ResidentHandler struct {
	expenseService      service.ExpenseService
	meterService        service.MeterService
	announcementService service.AnnouncementService
	dueService          service.DueService
	paymentService      service.PaymentService
}

func NewResidentHandler(
	expenseService service.ExpenseService,
	meterService service.MeterService,
	announcementService service.AnnouncementService,
	dueService service.DueService,
	paymentService service.PaymentService,
) *ResidentHandler {
	return &ResidentHandler{
		expenseService:      expenseService,
		meterService:        meterService,
		announcementService: announcementService,
		dueService:          dueService,
		paymentService:      paymentService,
	}
}

func (h *ResidentHandler) Routes() chi.Router {
	r := chi.NewRouter()

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

func (h *ResidentHandler) ListMyDebts(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok || claims.SiteID == nil || *claims.SiteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site bulunamadı"})
		return
	}

	filter := domain.DebtFilter{
		DebtorUserID: &claims.UserID,
	}

	debts, err := h.dueService.ListDebts(r.Context(), *claims.SiteID, filter)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, debts)
}

func (h *ResidentHandler) ListMyPayments(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok || claims.SiteID == nil || *claims.SiteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site bulunamadı"})
		return
	}

	filter := domain.PaymentFilter{
		DebtorUserID: &claims.UserID,
	}

	payments, err := h.paymentService.ListPayments(r.Context(), *claims.SiteID, filter)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, payments)
}

func (h *ResidentHandler) GetTreasurySummary(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok || claims.SiteID == nil || *claims.SiteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site bulunamadı"})
		return
	}

	summary, err := h.expenseService.GetTreasurySummary(r.Context(), *claims.SiteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, summary)
}

func (h *ResidentHandler) GetResidentMeterHistory(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok || claims.SiteID == nil || *claims.SiteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site bulunamadı"})
		return
	}

	history, err := h.meterService.GetResidentMeterHistory(r.Context(), claims.UserID, *claims.SiteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, history)
}

func (h *ResidentHandler) ListAnnouncements(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok || claims.SiteID == nil || *claims.SiteID == "" {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": "kullanıcının bağlı olduğu bir site bulunamadı"})
		return
	}

	announcements, err := h.announcementService.ListAnnouncements(r.Context(), *claims.SiteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, announcements)
}

