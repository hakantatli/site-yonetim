package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
)

var (
	ErrDueRateNotFound          = errors.New("bu site için geçerli bir aidat tutarı bulunamadı")
	ErrInvalidDueAmount         = errors.New("aidat tutarı sıfırdan büyük olmalıdır")
	ErrInvalidEffectiveDate     = errors.New("geçersiz geçerlilik tarihi")
	ErrOwnerRequiredForFixture  = errors.New("demirbaş ve yatırım borçları yalnızca dairenin ev sahibine yansıtılabilir, bu dairede kayıtlı ev sahibi bulunmuyor")
	ErrDebtorRequired           = errors.New("borcun muhatabı olabilecek geçerli bir kişi bulunamadı")
	ErrInvalidDebtAmount        = errors.New("borç tutarı sıfırdan büyük olmalıdır")
	ErrApartmentNotFound        = errors.New("daire bulunamadı")
	ErrDebtNotFound             = domain.ErrDebtNotFound
	ErrDebtHasPayments          = errors.New("üzerinde ödeme kaydı bulunan borç silinemez")
)

type DueService interface {
	GetDueSummary(ctx context.Context, siteID string) (*domain.DueRateSummary, error)
	SetDueRate(ctx context.Context, siteID, userID string, req domain.SetDueRateRequest) (*domain.DueRate, error)
	ListDebts(ctx context.Context, siteID string, filter domain.DebtFilter) ([]domain.DebtDetail, error)
	GetDebtStats(ctx context.Context, siteID string) (*domain.DebtStats, error)
	GetDebtByID(ctx context.Context, id, siteID string) (*domain.DebtDetail, error)
	CreateManualDebt(ctx context.Context, siteID, userID string, req domain.CreateManualDebtRequest) (*domain.Debt, error)
	CreateBulkDebt(ctx context.Context, siteID, userID string, req domain.CreateBulkDebtRequest) (*domain.BulkDebtResult, error)
	DeleteDebt(ctx context.Context, id, siteID string) error
	AccrueMonthlyDuesForSite(ctx context.Context, siteID string, targetMonth time.Time, triggeredBy *string) (*domain.AccrueMonthlyDuesResult, error)
	AccrueMonthlyDuesForAllSites(ctx context.Context, targetMonth time.Time) error
}

type dueService struct {
	dueRepo       repository.DueRepository
	debtRepo      repository.DebtRepository
	apartmentRepo repository.ApartmentRepository
	siteRepo      repository.SiteRepository
}

func NewDueService(
	dueRepo repository.DueRepository,
	debtRepo repository.DebtRepository,
	apartmentRepo repository.ApartmentRepository,
	siteRepo repository.SiteRepository,
) DueService {
	return &dueService{
		dueRepo:       dueRepo,
		debtRepo:      debtRepo,
		apartmentRepo: apartmentRepo,
		siteRepo:      siteRepo,
	}
}

func (s *dueService) GetDueSummary(ctx context.Context, siteID string) (*domain.DueRateSummary, error) {
	history, err := s.dueRepo.GetHistory(ctx, siteID)
	if err != nil {
		return nil, err
	}

	today := time.Now().Format("2006-01-02")
	current, err := s.dueRepo.GetCurrent(ctx, siteID, today)
	if err != nil {
		return nil, err
	}

	var upcoming *domain.DueRate
	for _, rate := range history {
		if rate.ValidFrom > today {
			upcoming = &rate
			break
		}
	}

	return &domain.DueRateSummary{
		CurrentRate:  current,
		UpcomingRate: upcoming,
		History:      history,
	}, nil
}

func (s *dueService) SetDueRate(ctx context.Context, siteID, userID string, req domain.SetDueRateRequest) (*domain.DueRate, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidDueAmount
	}

	now := time.Now()
	var validFrom string

	switch req.EffectiveType {
	case "this_month":
		validFrom = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
	case "next_month":
		validFrom = time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
	case "custom":
		if req.ValidFrom == nil || *req.ValidFrom == "" {
			return nil, ErrInvalidEffectiveDate
		}
		t, err := time.Parse("2006-01-02", *req.ValidFrom)
		if err != nil {
			return nil, ErrInvalidEffectiveDate
		}
		validFrom = t.Format("2006-01-02")
	default:
		validFrom = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
	}

	rate, err := s.dueRepo.Upsert(ctx, siteID, req.Amount, validFrom, userID)
	if err != nil {
		return nil, err
	}

	return rate, nil
}

func (s *dueService) ListDebts(ctx context.Context, siteID string, filter domain.DebtFilter) ([]domain.DebtDetail, error) {
	filter.SiteID = siteID
	return s.debtRepo.List(ctx, filter)
}

func (s *dueService) GetDebtStats(ctx context.Context, siteID string) (*domain.DebtStats, error) {
	return s.debtRepo.GetStats(ctx, siteID)
}

func (s *dueService) GetDebtByID(ctx context.Context, id, siteID string) (*domain.DebtDetail, error) {
	return s.debtRepo.GetByID(ctx, id, siteID)
}

func (s *dueService) CreateManualDebt(ctx context.Context, siteID, userID string, req domain.CreateManualDebtRequest) (*domain.Debt, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidDebtAmount
	}
	if req.Description == "" {
		return nil, errors.New("borç açıklaması zorunludur")
	}

	apt, err := s.apartmentRepo.GetApartmentByID(ctx, req.ApartmentID, siteID)
	if err != nil {
		return nil, err
	}
	if apt == nil {
		return nil, ErrApartmentNotFound
	}

	var debtorID string

	switch req.Type {
	case domain.DebtTypeFixture, domain.DebtTypeInvestment:
		// Demirbaş ve Ekstra Yatırım Giderleri kural gereği doğrudan Ev Sahibi'ne yansıtılır
		if apt.OwnerUserID == nil || *apt.OwnerUserID == "" {
			return nil, ErrOwnerRequiredForFixture
		}
		debtorID = *apt.OwnerUserID

	case domain.DebtTypeOther, domain.DebtTypeMonthlyDue:
		if req.DebtorUserID != nil && *req.DebtorUserID != "" {
			// Kullanıcı belirtilmişse daireyle ilişkili olmalı
			if (apt.OwnerUserID != nil && *apt.OwnerUserID == *req.DebtorUserID) ||
				(apt.TenantUserID != nil && *apt.TenantUserID == *req.DebtorUserID) {
				debtorID = *req.DebtorUserID
			} else {
				return nil, errors.New("seçilen kişi bu dairenin aktif sakini veya maliki değil")
			}
		} else {
			// Belirtilmemişse öncelik kiracıda, yoksa ev sahibinde
			if apt.TenantUserID != nil && *apt.TenantUserID != "" {
				debtorID = *apt.TenantUserID
			} else if apt.OwnerUserID != nil && *apt.OwnerUserID != "" {
				debtorID = *apt.OwnerUserID
			} else {
				return nil, ErrDebtorRequired
			}
		}

	default:
		return nil, errors.New("geçersiz borç türü")
	}

	dueMonth := req.DueMonth
	if dueMonth == nil || *dueMonth == "" {
		now := time.Now()
		firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
		dueMonth = &firstOfMonth
	}

	debt := &domain.Debt{
		SiteID:       siteID,
		ApartmentID:  req.ApartmentID,
		DebtorUserID: debtorID,
		Type:         req.Type,
		Amount:       req.Amount,
		DueMonth:     dueMonth,
		Description:  &req.Description,
		Status:       domain.DebtStatusOpen,
		CreatedBy:    &userID,
	}

	created, err := s.debtRepo.Create(ctx, debt)
	if err != nil {
		return nil, err
	}

	// TODO: Bildirim hook noktası — sakinlere manuel borç bildirimi (ilerleyen versiyonlar)
	slog.Info("manual debt created successfully", "debt_id", created.ID, "site_id", siteID, "apartment_id", req.ApartmentID, "type", req.Type, "amount", req.Amount)

	return created, nil
}

func (s *dueService) CreateBulkDebt(ctx context.Context, siteID, userID string, req domain.CreateBulkDebtRequest) (*domain.BulkDebtResult, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidDebtAmount
	}
	if strings.TrimSpace(req.Description) == "" {
		return nil, errors.New("açıklama alanı zorunludur")
	}

	dueMonth := req.DueMonth
	if dueMonth == nil || *dueMonth == "" {
		now := time.Now()
		firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")
		dueMonth = &firstOfMonth
	}

	apartments, err := s.debtRepo.ListActiveApartmentsForAccrual(ctx, siteID)
	if err != nil {
		return nil, err
	}

	createdCount := 0
	skippedCount := 0
	var createdIDs []string

	for _, apt := range apartments {
		var debtorID string

		// Muhatap belirleme: Demirbaş/Yatırım veya malik hedefli ise ev sahibi zorunludur
		if req.Type == domain.DebtTypeFixture || req.Type == domain.DebtTypeInvestment || (req.DebtorTarget != nil && *req.DebtorTarget == "owner") {
			if !apt.OwnerUserID.Valid {
				skippedCount++
				continue
			}
			debtorID = repository.UUIDToString(apt.OwnerUserID)
		} else {
			// Diğer durumlarda öncelik kiracıda, yoksa ev sahibinde
			if apt.TenantUserID.Valid {
				debtorID = repository.UUIDToString(apt.TenantUserID)
			} else if apt.OwnerUserID.Valid {
				debtorID = repository.UUIDToString(apt.OwnerUserID)
			} else {
				skippedCount++
				continue
			}
		}

		debt := &domain.Debt{
			SiteID:       siteID,
			ApartmentID:  repository.UUIDToString(apt.ID),
			DebtorUserID: debtorID,
			Type:         req.Type,
			Amount:       req.Amount,
			DueMonth:     dueMonth,
			Description:  &req.Description,
			Status:       domain.DebtStatusOpen,
			CreatedBy:    &userID,
		}

		created, err := s.debtRepo.Create(ctx, debt)
		if err != nil {
			slog.Error("failed to create bulk debt for apartment", "apartment_id", apt.ID, "error", err)
			skippedCount++
			continue
		}

		createdCount++
		createdIDs = append(createdIDs, created.ID)
	}

	slog.Info("bulk debt created successfully", "site_id", siteID, "created_count", createdCount, "skipped_count", skippedCount, "amount_per_apt", req.Amount)

	return &domain.BulkDebtResult{
		CreatedCount: createdCount,
		SkippedCount: skippedCount,
		TotalAmount:  float64(createdCount) * req.Amount,
		ApartmentIDs: createdIDs,
	}, nil
}


func (s *dueService) DeleteDebt(ctx context.Context, id, siteID string) error {
	debt, err := s.debtRepo.GetByID(ctx, id, siteID)
	if err != nil {
		return err
	}
	if debt == nil {
		return ErrDebtNotFound
	}

	if debt.PaidAmount > 0 {
		return ErrDebtHasPayments
	}

	if err := s.debtRepo.Delete(ctx, id, siteID); err != nil {
		return err
	}

	slog.Info("debt deleted successfully", "debt_id", id, "site_id", siteID)
	return nil
}

func (s *dueService) AccrueMonthlyDuesForSite(ctx context.Context, siteID string, targetMonth time.Time, triggeredBy *string) (*domain.AccrueMonthlyDuesResult, error) {
	monthStr := time.Date(targetMonth.Year(), targetMonth.Month(), 1, 0, 0, 0, 0, time.Local).Format("2006-01-02")

	rate, err := s.dueRepo.GetCurrent(ctx, siteID, monthStr)
	if err != nil {
		return nil, err
	}
	if rate == nil || rate.Amount <= 0 {
		return nil, ErrDueRateNotFound
	}

	apartments, err := s.debtRepo.ListActiveApartmentsForAccrual(ctx, siteID)
	if err != nil {
		return nil, err
	}

	createdCount := 0
	skippedCount := 0
	desc := fmt.Sprintf("%s Aidat Borcu", targetMonth.Format("2006-01"))

	for _, apt := range apartments {
		var debtorID string
		if apt.TenantUserID.Valid {
			debtorID = repository.UUIDToString(apt.TenantUserID)
		} else if apt.OwnerUserID.Valid {
			debtorID = repository.UUIDToString(apt.OwnerUserID)
		} else {
			// Hem ev sahibi hem kiracı boş olan daireler tahakkuk ettirilmez
			skippedCount++
			continue
		}

		aptID := repository.UUIDToString(apt.ID)
		debtID, err := s.debtRepo.AccrueMonthlyDue(ctx, siteID, aptID, debtorID, rate.Amount, monthStr, desc, triggeredBy)
		if err != nil {
			slog.Error("failed to accrue monthly due for apartment", "apartment_id", aptID, "error", err)
			skippedCount++
			continue
		}

		if debtID != "" {
			createdCount++
			// TODO: Bildirim hook noktası — sakinlere yeni aidat tahakkuku bildirimi (ilerleyen versiyonlar)
		} else {
			// Zaten daha önce tahakkuk ettirilmiş (idempotent)
			skippedCount++
		}
	}

	slog.Info("monthly dues accrual completed for site",
		"site_id", siteID,
		"target_month", monthStr,
		"created_count", createdCount,
		"skipped_count", skippedCount,
		"amount", rate.Amount,
	)

	return &domain.AccrueMonthlyDuesResult{
		TargetMonth:  monthStr,
		CreatedCount: createdCount,
		SkippedCount: skippedCount,
		Amount:       rate.Amount,
	}, nil
}

func (s *dueService) AccrueMonthlyDuesForAllSites(ctx context.Context, targetMonth time.Time) error {
	sites, err := s.siteRepo.List(ctx)
	if err != nil {
		return err
	}

	slog.Info("starting monthly dues accrual for all sites", "site_count", len(sites), "month", targetMonth.Format("2006-01"))

	for _, site := range sites {
		_, err := s.AccrueMonthlyDuesForSite(ctx, site.ID, targetMonth, nil)
		if err != nil {
			if errors.Is(err, ErrDueRateNotFound) {
				slog.Warn("site has no active due rate, skipping auto accrual", "site_id", site.ID, "site_name", site.Name)
			} else {
				slog.Error("failed to auto-accrue monthly dues for site", "site_id", site.ID, "error", err)
			}
		}
	}

	return nil
}
