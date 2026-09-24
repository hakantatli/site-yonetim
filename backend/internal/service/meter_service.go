package service

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
)

type MeterService interface {
	CreateMeterType(ctx context.Context, siteID, name, unit string) (*domain.MeterType, error)
	ListMeterTypes(ctx context.Context, siteID string, activeOnly bool) ([]domain.MeterType, error)
	UpdateMeterType(ctx context.Context, id, siteID, name, unit string, isActive bool) (*domain.MeterType, error)
	DeleteMeterType(ctx context.Context, id, siteID string) error

	GetPreviousReadings(ctx context.Context, siteID, meterTypeID string) (*domain.PreviousReadingsResponse, error)
	CreateConsumptionPeriod(ctx context.Context, siteID string, createdBy string, req domain.CreateConsumptionPeriodPayload) (*domain.ConsumptionPeriod, []domain.MeterReading, error)
	ListConsumptionPeriods(ctx context.Context, siteID string) ([]domain.ConsumptionPeriod, error)
	GetConsumptionPeriod(ctx context.Context, id, siteID string) (*domain.ConsumptionPeriod, []domain.MeterReading, error)
	DeleteConsumptionPeriod(ctx context.Context, id, siteID string) error
	GetResidentMeterHistory(ctx context.Context, userID, siteID string) ([]domain.ResidentMeterHistoryItem, error)
}

type meterService struct {
	meterRepo     repository.MeterRepository
	apartmentRepo repository.ApartmentRepository
	debtRepo      repository.DebtRepository
}

func NewMeterService(
	meterRepo repository.MeterRepository,
	apartmentRepo repository.ApartmentRepository,
	debtRepo repository.DebtRepository,
) MeterService {
	return &meterService{
		meterRepo:     meterRepo,
		apartmentRepo: apartmentRepo,
		debtRepo:      debtRepo,
	}
}

func (s *meterService) CreateMeterType(ctx context.Context, siteID, name, unit string) (*domain.MeterType, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("sayaç türü adı boş olamaz")
	}
	unit = strings.TrimSpace(unit)
	if unit == "" {
		unit = "m³"
	}
	return s.meterRepo.CreateMeterType(ctx, siteID, name, unit, true)
}

func (s *meterService) ListMeterTypes(ctx context.Context, siteID string, activeOnly bool) ([]domain.MeterType, error) {
	return s.meterRepo.ListMeterTypes(ctx, siteID, activeOnly)
}

func (s *meterService) UpdateMeterType(ctx context.Context, id, siteID, name, unit string, isActive bool) (*domain.MeterType, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("sayaç türü adı boş olamaz")
	}
	unit = strings.TrimSpace(unit)
	if unit == "" {
		unit = "m³"
	}
	return s.meterRepo.UpdateMeterType(ctx, id, siteID, name, unit, isActive)
}

func (s *meterService) DeleteMeterType(ctx context.Context, id, siteID string) error {
	count, err := s.meterRepo.CountPeriodsByMeterType(ctx, id, siteID)
	if err != nil {
		return err
	}
	if count > 0 {
		// Kayıtlı dönemleri olan sayaç türü fiziksel silinmez, pasife alınır
		_, err = s.meterRepo.UpdateMeterType(ctx, id, siteID, "", "", false)
		return err
	}
	return s.meterRepo.DeleteMeterType(ctx, id, siteID)
}

func (s *meterService) GetPreviousReadings(ctx context.Context, siteID, meterTypeID string) (*domain.PreviousReadingsResponse, error) {
	mainReading, apts, err := s.meterRepo.GetPreviousReadings(ctx, siteID, meterTypeID)
	if err != nil {
		return nil, err
	}
	return &domain.PreviousReadingsResponse{
		MainMeterPrevious: mainReading,
		Apartments:        apts,
	}, nil
}

func (s *meterService) CreateConsumptionPeriod(
	ctx context.Context,
	siteID string,
	createdBy string,
	req domain.CreateConsumptionPeriodPayload,
) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
	if req.TotalBillAmount <= 0 {
		return nil, nil, domain.ErrInvalidBillAmount
	}

	totalBilledConsumption := math.Round((req.MainMeterCurrent-req.MainMeterPrevious)*1000) / 1000
	if totalBilledConsumption <= 0 {
		return nil, nil, domain.ErrInvalidConsumption
	}

	unitCost := req.TotalBillAmount / totalBilledConsumption

	// Sayaç türünü doğrula
	meterType, err := s.meterRepo.GetMeterTypeByID(ctx, req.MeterTypeID, siteID)
	if err != nil {
		return nil, nil, domain.ErrMeterTypeNotFound
	}

	// Dairelerin tüketim toplamını hesapla ve doğrula
	var totalApartmentsConsumption float64
	for _, rd := range req.Readings {
		consumption := math.Round((rd.CurrentReading-rd.PreviousReading)*1000) / 1000
		if consumption < 0 {
			return nil, nil, fmt.Errorf("daire sayaç son endeksi ilk endeksten küçük olamaz")
		}
		totalApartmentsConsumption += consumption
	}
	totalApartmentsConsumption = math.Round(totalApartmentsConsumption*1000) / 1000

	if totalApartmentsConsumption > totalBilledConsumption {
		return nil, nil, domain.ErrApartmentsExceedMainMeter
	}

	commonAreaConsumption := math.Round((totalBilledConsumption-totalApartmentsConsumption)*1000) / 1000

	// Sitedeki daireleri çek (muhatap belirlemek için)
	apts, err := s.apartmentRepo.ListApartments(ctx, siteID)
	if err != nil {
		return nil, nil, fmt.Errorf("daire listesi alınamadı: %w", err)
	}
	aptMap := make(map[string]domain.Apartment, len(apts))
	for _, apt := range apts {
		aptMap[apt.ID] = apt
	}

	// Dönem tarih formatı YYYY-MM-DD
	periodDateStr := req.Period
	if len(periodDateStr) == 7 { // YYYY-MM
		periodDateStr = periodDateStr + "-01"
	}

	pMonthTime, _ := time.Parse("2006-01-02", periodDateStr)
	periodMonthLabel := pMonthTime.Format("01/2006")

	readingsToSave := make([]domain.MeterReading, len(req.Readings))
	var totalApartmentsAmount float64

	for i, rd := range req.Readings {
		consumption := math.Round((rd.CurrentReading-rd.PreviousReading)*1000) / 1000
		// Borçları virgülden sonraki kısımları kaldırarak en yakın tam sayıya yuvarla
		indAmount := math.Round(consumption * unitCost)
		totalApartmentsAmount += indAmount

		apt, ok := aptMap[rd.ApartmentID]
		var debtorID *string
		var debtorName *string
		var debtorPhone *string
		var doorNumber string = "Daire"
		var blockName *string

		if ok {
			doorNumber = apt.DoorNumber
			blockName = apt.BlockName
			if apt.TenantUserID != nil && *apt.TenantUserID != "" {
				debtorID = apt.TenantUserID
				debtorName = apt.TenantFullName
				debtorPhone = apt.TenantPhone
			} else if apt.OwnerUserID != nil && *apt.OwnerUserID != "" {
				debtorID = apt.OwnerUserID
				debtorName = apt.OwnerFullName
				debtorPhone = apt.OwnerPhone
			}
		}

		readingsToSave[i] = domain.MeterReading{
			ApartmentID:      rd.ApartmentID,
			DoorNumber:       doorNumber,
			BlockName:        blockName,
			DebtorUserID:     debtorID,
			DebtorFullName:   debtorName,
			DebtorPhone:      debtorPhone,
			PreviousReading:  rd.PreviousReading,
			CurrentReading:   rd.CurrentReading,
			Consumption:      consumption,
			IndividualAmount: indAmount,
			CommonAreaAmount: 0,
			TotalAmount:      indAmount,
			ReadingDate:      time.Now().Format("2006-01-02"),
			Notes:            rd.Notes,
		}
	}

	// Ortak alan tutarı: Fatura tutarı - Dairelerin yuvarlanmış toplam tutarı
	// Dairelerin toplamı ve ortak alanın toplamı her zaman fatura tutarına eşit olur (yuvarlama farkı ortak alana yansır).
	commonAreaCost := math.Round((req.TotalBillAmount-totalApartmentsAmount)*100) / 100
	if commonAreaCost < 0 {
		commonAreaCost = 0
	}

	// Borçları (debts) oluştur (Ortak alan site yönetimi borcudur, daireye sadece bireysel tüketim tahakkuk eder)
	for i := range readingsToSave {
		rd := &readingsToSave[i]
		if rd.DebtorUserID == nil || *rd.DebtorUserID == "" {
			continue // Sakin atanmamış boş daireye borç açılmaz
		}

		if rd.TotalAmount <= 0 {
			continue // Tüketim 0 ise borç açmaya gerek yok
		}

		debtDesc := fmt.Sprintf("%s %s Tüketim Bedeli (%.2f %s x ₺%.2f)",
			periodMonthLabel, meterType.Name, rd.Consumption, meterType.Unit, unitCost)

		createdDebt, err := s.debtRepo.Create(ctx, &domain.Debt{
			SiteID:       siteID,
			ApartmentID:  rd.ApartmentID,
			DebtorUserID: *rd.DebtorUserID,
			Type:         domain.DebtTypeUtility,
			Amount:       rd.TotalAmount,
			DueMonth:     &periodDateStr,
			Description:  &debtDesc,
			Status:       domain.DebtStatusOpen,
			CreatedBy:    &createdBy,
		})
		if err == nil && createdDebt != nil {
			rd.DebtID = &createdDebt.ID
		}
	}

	period := &domain.ConsumptionPeriod{
		SiteID:                     siteID,
		MeterTypeID:                req.MeterTypeID,
		Period:                     periodDateStr,
		MainMeterPrevious:          req.MainMeterPrevious,
		MainMeterCurrent:           req.MainMeterCurrent,
		TotalBilledConsumption:     totalBilledConsumption,
		TotalApartmentsConsumption: totalApartmentsConsumption,
		CommonAreaConsumption:      commonAreaConsumption,
		TotalBillAmount:            req.TotalBillAmount,
		UnitCost:                   unitCost,
		CommonAreaCost:             commonAreaCost,
		BillDate:                   req.BillDate,
		BillNo:                     req.BillNo,
		Description:                req.Description,
		CreatedBy:                  &createdBy,
	}

	return s.meterRepo.CreateConsumptionPeriodWithReadings(ctx, period, readingsToSave)
}

func (s *meterService) ListConsumptionPeriods(ctx context.Context, siteID string) ([]domain.ConsumptionPeriod, error) {
	return s.meterRepo.ListConsumptionPeriods(ctx, siteID)
}

func (s *meterService) GetConsumptionPeriod(ctx context.Context, id, siteID string) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
	return s.meterRepo.GetConsumptionPeriod(ctx, id, siteID)
}

func (s *meterService) DeleteConsumptionPeriod(ctx context.Context, id, siteID string) error {
	deletedDebtIDs, err := s.meterRepo.DeleteConsumptionPeriod(ctx, id, siteID)
	if err != nil {
		return err
	}

	// İlgili borçları da temizle
	for _, debtID := range deletedDebtIDs {
		_ = s.debtRepo.Delete(ctx, debtID, siteID)
	}

	return nil
}

func (s *meterService) GetResidentMeterHistory(ctx context.Context, userID, siteID string) ([]domain.ResidentMeterHistoryItem, error) {
	apts, err := s.apartmentRepo.ListApartments(ctx, siteID)
	if err != nil {
		return nil, fmt.Errorf("failed to list apartments: %w", err)
	}

	var userApartmentID string
	for _, a := range apts {
		if (a.TenantUserID != nil && *a.TenantUserID == userID) || (a.OwnerUserID != nil && *a.OwnerUserID == userID) {
			userApartmentID = a.ID
			break
		}
	}

	if userApartmentID == "" {
		return []domain.ResidentMeterHistoryItem{}, nil
	}

	return s.meterRepo.GetResidentMeterHistory(ctx, userApartmentID)
}
