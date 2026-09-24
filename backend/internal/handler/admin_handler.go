package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/middleware"
	"github.com/hakantatli/site-yonetim/internal/service"
)

type AdminHandler struct {
	apartmentService    service.ApartmentService
	dueService          service.DueService
	paymentService      service.PaymentService
	expenseService      service.ExpenseService
	meterService        service.MeterService
	announcementService service.AnnouncementService
}

func NewAdminHandler(
	apartmentService service.ApartmentService,
	dueService service.DueService,
	paymentService service.PaymentService,
	expenseService service.ExpenseService,
	meterService service.MeterService,
	announcementService service.AnnouncementService,
) *AdminHandler {
	return &AdminHandler{
		apartmentService:    apartmentService,
		dueService:          dueService,
		paymentService:      paymentService,
		expenseService:      expenseService,
		meterService:        meterService,
		announcementService: announcementService,
	}
}

func (h *AdminHandler) Routes() chi.Router {
	r := chi.NewRouter()

	// Blocks
	r.Get("/blocks", h.ListBlocks)
	r.Post("/blocks", h.CreateBlock)
	r.Delete("/blocks/{id}", h.DeleteBlock)

	// Apartments
	r.Get("/apartments", h.ListApartments)
	r.Post("/apartments", h.CreateApartment)
	r.Get("/apartments/{id}", h.GetApartment)
	r.Patch("/apartments/{id}", h.UpdateApartment)
	r.Delete("/apartments/{id}", h.SoftDeleteApartment)

	// Residents
	r.Post("/apartments/{id}/owner", h.SetOwner)
	r.Post("/apartments/{id}/tenant", h.SetTenant)
	r.Delete("/apartments/{id}/tenant", h.RemoveTenant)
	r.Get("/apartments/{id}/tenant-history", h.ListTenantHistory)
	r.Put("/residents/{id}", h.UpdateResident)
	r.Patch("/residents/{id}", h.UpdateResident)

	// Due Rates
	r.Get("/due-rates", h.GetDueRates)
	r.Post("/due-rates", h.SetDueRate)

	// Debts
	r.Get("/debts", h.ListDebts)
	r.Post("/debts", h.CreateManualDebt)
	r.Post("/debts/bulk", h.CreateBulkDebt)
	r.Get("/debts/{id}", h.GetDebt)
	r.Delete("/debts/{id}", h.DeleteDebt)
	r.Post("/debts/accrue-monthly", h.AccrueMonthlyDues)

	// Payments
	r.Get("/payments", h.ListPayments)
	r.Post("/payments", h.RecordPayment)
	r.Get("/payments/stats", h.GetPaymentStats)
	r.Get("/payments/{id}", h.GetPayment)
	r.Delete("/payments/{id}", h.DeletePayment)
	r.Get("/debts/{id}/payments", h.ListPaymentsByDebt)

	// Expense Categories
	r.Get("/expense-categories", h.ListExpenseCategories)
	r.Post("/expense-categories", h.CreateExpenseCategory)
	r.Patch("/expense-categories/{id}", h.UpdateExpenseCategory)
	r.Delete("/expense-categories/{id}", h.DeleteExpenseCategory)

	// Expenses
	r.Get("/expenses", h.ListExpenses)
	r.Post("/expenses", h.CreateExpense)
	r.Delete("/expenses/{id}", h.DeleteExpense)

	// Treasury
	r.Get("/treasury", h.GetTreasurySummary)
	r.Patch("/treasury/initial-balance", h.UpdateTreasuryInitialBalance)

	// Meters (Sayaçlar & Faturalandırma)
	r.Get("/meters/types", h.ListMeterTypes)
	r.Post("/meters/types", h.CreateMeterType)
	r.Patch("/meters/types/{id}", h.UpdateMeterType)
	r.Delete("/meters/types/{id}", h.DeleteMeterType)
	r.Get("/meters/previous-readings", h.GetPreviousReadings)
	r.Get("/meters/periods", h.ListConsumptionPeriods)
	r.Post("/meters/periods", h.CreateConsumptionPeriod)
	r.Get("/meters/periods/{id}", h.GetConsumptionPeriod)
	r.Delete("/meters/periods/{id}", h.DeleteConsumptionPeriod)

	// Announcements
	r.Get("/announcements", h.ListAnnouncements)
	r.Post("/announcements", h.CreateAnnouncement)
	r.Get("/announcements/{id}", h.GetAnnouncement)
	r.Patch("/announcements/{id}", h.UpdateAnnouncement)
	r.Delete("/announcements/{id}", h.DeleteAnnouncement)

	return r
}


func (h *AdminHandler) getSiteID(r *http.Request) (string, error) {
	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		return "", errors.New("unauthorized")
	}

	// 1. URL Param
	siteID := chi.URLParam(r, "siteID")
	if siteID == "" {
		// 2. Query param (for owner override or admin convenience)
		siteID = r.URL.Query().Get("siteId")
	}

	// If user is not owner, they can only access their own site
	if claims.Role != domain.RoleOwner {
		if claims.SiteID == nil || *claims.SiteID == "" {
			return "", errors.New("user has no assigned site")
		}
		if siteID != "" && siteID != *claims.SiteID {
			return "", errors.New("forbidden: cross-site access prohibited")
		}
		return *claims.SiteID, nil
	}

	// User is owner
	if siteID != "" {
		return siteID, nil
	}
	if claims.SiteID != nil && *claims.SiteID != "" {
		return *claims.SiteID, nil
	}

	return "", errors.New("site ID required for this operation")
}

// Blocks
func (h *AdminHandler) ListBlocks(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	blocks, err := h.apartmentService.ListBlocks(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "bloklar listelenemedi"})
		return
	}
	respondJSON(w, http.StatusOK, blocks)
}

func (h *AdminHandler) CreateBlock(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	var req struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "blok adı zorunludur"})
		return
	}

	block, err := h.apartmentService.CreateBlock(r.Context(), siteID, req.Name)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "blok oluşturulamadı"})
		return
	}
	respondJSON(w, http.StatusCreated, block)
}

func (h *AdminHandler) DeleteBlock(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	blockID := chi.URLParam(r, "id")

	if err := h.apartmentService.DeleteBlock(r.Context(), siteID, blockID); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "blok silinemedi"})
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "blok silindi"})
}

// Apartments
func (h *AdminHandler) ListApartments(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	apartments, err := h.apartmentService.ListApartments(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "daireler listelenemedi"})
		return
	}
	respondJSON(w, http.StatusOK, apartments)
}

func (h *AdminHandler) GetApartment(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	apartmentID := chi.URLParam(r, "id")

	apt, err := h.apartmentService.GetApartmentByID(r.Context(), siteID, apartmentID)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "daire bulunamadı"})
		return
	}
	respondJSON(w, http.StatusOK, apt)
}

func (h *AdminHandler) CreateApartment(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	var req domain.CreateApartmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	claims, _ := middleware.GetClaims(r.Context())
	var recordedBy *string
	if claims != nil {
		recordedBy = &claims.UserID
	}

	apt, err := h.apartmentService.CreateApartment(r.Context(), siteID, req, recordedBy)
	if err != nil {
		if errors.Is(err, service.ErrLimitExceeded) {
			respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error(), "code": "LIMIT_EXCEEDED"})
			return
		}
		if errors.Is(err, service.ErrDoorNumberRequired) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, apt)
}

func (h *AdminHandler) UpdateApartment(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	apartmentID := chi.URLParam(r, "id")

	var req domain.UpdateApartmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	apt, err := h.apartmentService.UpdateApartment(r.Context(), siteID, apartmentID, req)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, apt)
}

func (h *AdminHandler) SoftDeleteApartment(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	apartmentID := chi.URLParam(r, "id")

	if err := h.apartmentService.SoftDeleteApartment(r.Context(), siteID, apartmentID); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "daire silinemedi"})
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{"message": "daire başarıyla pasife alındı (veriler korundu)"})
}

// Residents
func (h *AdminHandler) SetOwner(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	apartmentID := chi.URLParam(r, "id")

	var req domain.ResidentInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Phone == "" || req.FullName == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "ad soyad ve telefon numarası zorunludur"})
		return
	}

	apt, err := h.apartmentService.SetOwner(r.Context(), siteID, apartmentID, req)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, apt)
}

func (h *AdminHandler) SetTenant(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	apartmentID := chi.URLParam(r, "id")

	var req domain.ResidentInput
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Phone == "" || req.FullName == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "ad soyad ve telefon numarası zorunludur"})
		return
	}

	claims, _ := middleware.GetClaims(r.Context())
	var recordedBy *string
	if claims != nil {
		recordedBy = &claims.UserID
	}

	apt, err := h.apartmentService.SetTenant(r.Context(), siteID, apartmentID, req, recordedBy)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, apt)
}

func (h *AdminHandler) RemoveTenant(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	apartmentID := chi.URLParam(r, "id")

	var req domain.RemoveTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	apt, err := h.apartmentService.RemoveTenant(r.Context(), siteID, apartmentID, req)
	if err != nil {
		if errors.Is(err, service.ErrOwnerRequiredForDebt) || errors.Is(err, service.ErrInvalidDebtAction) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, apt)
}

func (h *AdminHandler) ListTenantHistory(w http.ResponseWriter, r *http.Request) {
	apartmentID := chi.URLParam(r, "id")
	history, err := h.apartmentService.ListTenantHistory(r.Context(), apartmentID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": "kiracı geçmişi listelenemedi"})
		return
	}
	respondJSON(w, http.StatusOK, history)
}

func (h *AdminHandler) UpdateResident(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	residentID := chi.URLParam(r, "id")

	var req domain.UpdateResidentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	user, err := h.apartmentService.UpdateResident(r.Context(), siteID, residentID, req)
	if err != nil {
		if errors.Is(err, service.ErrResidentNotFound) {
			respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrResidentForbidden) {
			respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrFullNameRequired) || errors.Is(err, service.ErrPhoneRequired) ||
			errors.Is(err, service.ErrPhoneInUse) || errors.Is(err, service.ErrEmailInUse) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// ==========================================
// DUE RATES
// ==========================================

func (h *AdminHandler) GetDueRates(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	summary, err := h.dueService.GetDueSummary(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, summary)
}

func (h *AdminHandler) SetDueRate(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req domain.SetDueRateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	rate, err := h.dueService.SetDueRate(r.Context(), siteID, claims.UserID, req)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusCreated, rate)
}

// ==========================================
// DEBTS
// ==========================================

func (h *AdminHandler) ListDebts(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	q := r.URL.Query()
	var status *string
	if s := strings.TrimSpace(q.Get("status")); s != "" {
		status = &s
	}
	var debtType *string
	if t := strings.TrimSpace(q.Get("type")); t != "" {
		debtType = &t
	}
	var aptID *string
	if a := strings.TrimSpace(q.Get("apartment_id")); a != "" {
		aptID = &a
	}
	var debtorID *string
	if d := strings.TrimSpace(q.Get("debtor_user_id")); d != "" {
		debtorID = &d
	}

	filter := domain.DebtFilter{
		SiteID:       siteID,
		Status:       status,
		Type:         debtType,
		ApartmentID:  aptID,
		DebtorUserID: debtorID,
	}

	debts, err := h.dueService.ListDebts(r.Context(), siteID, filter)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	stats, err := h.dueService.GetDebtStats(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"debts": debts,
		"stats": stats,
	})
}

func (h *AdminHandler) CreateManualDebt(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req domain.CreateManualDebtRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	created, err := h.dueService.CreateManualDebt(r.Context(), siteID, claims.UserID, req)
	if err != nil {
		if errors.Is(err, service.ErrOwnerRequiredForFixture) || errors.Is(err, service.ErrDebtorRequired) || errors.Is(err, service.ErrInvalidDebtAmount) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *AdminHandler) CreateBulkDebt(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req domain.CreateBulkDebtRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	result, err := h.dueService.CreateBulkDebt(r.Context(), siteID, claims.UserID, req)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, result)
}

func (h *AdminHandler) GetDebt(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	debtID := chi.URLParam(r, "id")
	detail, err := h.dueService.GetDebtByID(r.Context(), debtID, siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	if detail == nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "borç kaydı bulunamadı"})
		return
	}
	respondJSON(w, http.StatusOK, detail)
}

func (h *AdminHandler) DeleteDebt(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	debtID := chi.URLParam(r, "id")
	if err := h.dueService.DeleteDebt(r.Context(), debtID, siteID); err != nil {
		if errors.Is(err, service.ErrDebtNotFound) {
			respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		if errors.Is(err, service.ErrDebtHasPayments) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "borç kaydı başarıyla silindi"})
}

type AccrueRequest struct {
	TargetMonth *string `json:"target_month"` // YYYY-MM
}

func (h *AdminHandler) AccrueMonthlyDues(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req AccrueRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	targetDate := time.Now()
	if req.TargetMonth != nil && *req.TargetMonth != "" {
		parsed, err := time.Parse("2006-01", *req.TargetMonth)
		if err == nil {
			targetDate = parsed
		}
	}

	result, err := h.dueService.AccrueMonthlyDuesForSite(r.Context(), siteID, targetDate, &claims.UserID)
	if err != nil {
		if errors.Is(err, service.ErrDueRateNotFound) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	respondJSON(w, http.StatusOK, result)
}

func (h *AdminHandler) RecordPayment(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req domain.RecordPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	payment, err := h.paymentService.RecordPayment(r.Context(), siteID, req, claims.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidPaymentAmount) ||
			errors.Is(err, domain.ErrInvalidPaymentMethod) ||
			errors.Is(err, domain.ErrDebtNotFound) ||
			errors.Is(err, domain.ErrDebtAlreadyPaid) ||
			errors.Is(err, domain.ErrPaymentExceedsRemaining) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, payment)
}

func (h *AdminHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	filter := domain.PaymentFilter{}
	if dID := r.URL.Query().Get("debt_id"); dID != "" {
		filter.DebtID = &dID
	}
	if aID := r.URL.Query().Get("apartment_id"); aID != "" {
		filter.ApartmentID = &aID
	}
	if method := r.URL.Query().Get("payment_method"); method != "" {
		filter.PaymentMethod = &method
	}
	if start := r.URL.Query().Get("start_date"); start != "" {
		filter.StartDate = &start
	}
	if end := r.URL.Query().Get("end_date"); end != "" {
		filter.EndDate = &end
	}

	payments, err := h.paymentService.ListPayments(r.Context(), siteID, filter)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, payments)
}

func (h *AdminHandler) GetPaymentStats(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	stats, err := h.paymentService.GetStats(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

func (h *AdminHandler) GetPayment(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	payment, err := h.paymentService.GetByID(r.Context(), id, siteID)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": "ödeme kaydı bulunamadı"})
		return
	}

	respondJSON(w, http.StatusOK, payment)
}

func (h *AdminHandler) DeletePayment(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.paymentService.DeletePayment(r.Context(), id, siteID); err != nil {
		if errors.Is(err, domain.ErrPaymentNotFound) {
			respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "ödeme kaydı başarıyla silindi"})
}

func (h *AdminHandler) ListPaymentsByDebt(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	debtID := chi.URLParam(r, "id")
	payments, err := h.paymentService.ListPaymentsByDebt(r.Context(), debtID, siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, payments)
}

// ─────────────────────────────────────────────
// Expense Categories
// ─────────────────────────────────────────────

func (h *AdminHandler) ListExpenseCategories(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	allParam := r.URL.Query().Get("all")
	activeOnly := allParam != "true" && allParam != "1"

	categories, err := h.expenseService.ListCategories(r.Context(), siteID, activeOnly)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, categories)
}

func (h *AdminHandler) CreateExpenseCategory(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	var req domain.CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	category, err := h.expenseService.CreateCategory(r.Context(), siteID, req)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, category)
}

func (h *AdminHandler) UpdateExpenseCategory(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	categoryID := chi.URLParam(r, "id")
	var req domain.UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	category, err := h.expenseService.UpdateCategory(r.Context(), categoryID, siteID, req)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, category)
}

func (h *AdminHandler) DeleteExpenseCategory(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	categoryID := chi.URLParam(r, "id")
	err = h.expenseService.DeleteCategory(r.Context(), categoryID, siteID)
	if err != nil {
		if errors.Is(err, service.ErrCategoryHasExpenses) {
			respondJSON(w, http.StatusOK, map[string]string{"message": "Kategoriye bağlı masraf kayıtları olduğu için silinmedi, pasife alındı."})
			return
		}
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Kategori başarıyla silindi."})
}

// ─────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────

func (h *AdminHandler) ListExpenses(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	q := r.URL.Query()
	var filter domain.ExpenseFilter
	if catID := q.Get("category_id"); catID != "" {
		filter.CategoryID = &catID
	}
	if start := q.Get("start_date"); start != "" {
		filter.StartDate = &start
	}
	if end := q.Get("end_date"); end != "" {
		filter.EndDate = &end
	}

	expenses, stats, err := h.expenseService.ListExpenses(r.Context(), siteID, filter)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"expenses": expenses,
		"stats":    stats,
	})
}

func (h *AdminHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req domain.CreateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	expense, err := h.expenseService.CreateExpense(r.Context(), siteID, req, claims.UserID)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, expense)
}

func (h *AdminHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	expenseID := chi.URLParam(r, "id")
	if err := h.expenseService.DeleteExpense(r.Context(), expenseID, siteID); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "masraf kaydı başarıyla silindi"})
}

// ─────────────────────────────────────────────
// Treasury (Kasa)
// ─────────────────────────────────────────────

func (h *AdminHandler) GetTreasurySummary(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	summary, err := h.expenseService.GetTreasurySummary(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, summary)
}

func (h *AdminHandler) UpdateTreasuryInitialBalance(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	var req domain.UpdateInitialBalanceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	updated, err := h.expenseService.UpdateSiteInitialBalance(r.Context(), siteID, req.InitialBalance)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"message":         "devir bakiyesi başarıyla güncellendi",
		"initial_balance": updated,
	})
}

// ─────────────────────────────────────────────
// Meters (Sayaçlar & Faturalandırma)
// ─────────────────────────────────────────────

func (h *AdminHandler) ListMeterTypes(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	all := r.URL.Query().Get("all") == "true"
	types, err := h.meterService.ListMeterTypes(r.Context(), siteID, !all)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, types)
}

func (h *AdminHandler) CreateMeterType(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	var req domain.CreateMeterTypePayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	created, err := h.meterService.CreateMeterType(r.Context(), siteID, req.Name, req.Unit)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, created)
}

func (h *AdminHandler) UpdateMeterType(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	var req domain.UpdateMeterTypePayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	updated, err := h.meterService.UpdateMeterType(r.Context(), id, siteID, req.Name, req.Unit, req.IsActive)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *AdminHandler) DeleteMeterType(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.meterService.DeleteMeterType(r.Context(), id, siteID); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "sayaç türü başarıyla silindi veya pasife alındı"})
}

func (h *AdminHandler) GetPreviousReadings(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	meterTypeID := r.URL.Query().Get("meter_type_id")
	if meterTypeID == "" {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "meter_type_id parametresi gereklidir"})
		return
	}

	resp, err := h.meterService.GetPreviousReadings(r.Context(), siteID, meterTypeID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

func (h *AdminHandler) ListConsumptionPeriods(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	periods, err := h.meterService.ListConsumptionPeriods(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, periods)
}

func (h *AdminHandler) CreateConsumptionPeriod(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
		return
	}

	var req domain.CreateConsumptionPeriodPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	period, readings, err := h.meterService.CreateConsumptionPeriod(r.Context(), siteID, claims.UserID, req)
	if err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, map[string]any{
		"period":   period,
		"readings": readings,
	})
}

func (h *AdminHandler) GetConsumptionPeriod(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	period, readings, err := h.meterService.GetConsumptionPeriod(r.Context(), id, siteID)
	if err != nil {
		respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"period":   period,
		"readings": readings,
	})
}

func (h *AdminHandler) DeleteConsumptionPeriod(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.meterService.DeleteConsumptionPeriod(r.Context(), id, siteID); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "faturalandırma oturumu ve ilişkili borçlar başarıyla silindi"})
}

// Announcements Handlers

func (h *AdminHandler) ListAnnouncements(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	list, err := h.announcementService.ListAnnouncements(r.Context(), siteID)
	if err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, list)
}

func (h *AdminHandler) CreateAnnouncement(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	claims, ok := middleware.GetClaims(r.Context())
	if !ok || claims.UserID == "" {
		respondJSON(w, http.StatusUnauthorized, map[string]string{"error": "yetkilendirme hatası"})
		return
	}

	var req domain.CreateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	announcement, err := h.announcementService.CreateAnnouncement(r.Context(), siteID, req, claims.UserID)
	if err != nil {
		if errors.Is(err, domain.ErrInvalidAnnouncementTitle) ||
			errors.Is(err, domain.ErrInvalidAnnouncementContent) ||
			errors.Is(err, domain.ErrInvalidAnnouncementPriority) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusCreated, announcement)
}

func (h *AdminHandler) GetAnnouncement(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	announcement, err := h.announcementService.GetAnnouncementByID(r.Context(), id, siteID)
	if err != nil {
		if errors.Is(err, domain.ErrAnnouncementNotFound) {
			respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, announcement)
}

func (h *AdminHandler) UpdateAnnouncement(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	var req domain.UpdateAnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondJSON(w, http.StatusBadRequest, map[string]string{"error": "geçersiz istek gövdesi"})
		return
	}

	announcement, err := h.announcementService.UpdateAnnouncement(r.Context(), id, siteID, req)
	if err != nil {
		if errors.Is(err, domain.ErrAnnouncementNotFound) {
			respondJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		if errors.Is(err, domain.ErrInvalidAnnouncementTitle) ||
			errors.Is(err, domain.ErrInvalidAnnouncementContent) ||
			errors.Is(err, domain.ErrInvalidAnnouncementPriority) {
			respondJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
			return
		}
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, announcement)
}

func (h *AdminHandler) DeleteAnnouncement(w http.ResponseWriter, r *http.Request) {
	siteID, err := h.getSiteID(r)
	if err != nil {
		respondJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}

	id := chi.URLParam(r, "id")
	if err := h.announcementService.DeleteAnnouncement(r.Context(), id, siteID); err != nil {
		respondJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "duyuru başarıyla silindi"})
}




