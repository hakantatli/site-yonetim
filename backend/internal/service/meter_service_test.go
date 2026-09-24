package service

import (
	"context"
	"math"
	"testing"

	"github.com/hakantatli/site-yonetim/internal/domain"
)

func TestMeterService_CreateConsumptionPeriod_Reconciliation(t *testing.T) {
	ctx := context.Background()

	ownerID1 := "owner-1"
	ownerID2 := "owner-2"

	apt1 := domain.Apartment{ID: "apt-1", SiteID: "site-1", DoorNumber: "1", OwnerUserID: &ownerID1}
	apt2 := domain.Apartment{ID: "apt-2", SiteID: "site-1", DoorNumber: "2", OwnerUserID: &ownerID2}

	aptRepo := &mockApartmentRepository{
		listApartmentsFn: func(ctx context.Context, siteID string) ([]domain.Apartment, error) {
			return []domain.Apartment{apt1, apt2}, nil
		},
	}

	meterRepo := &mockMeterRepository{
		getMeterTypeByIDFn: func(ctx context.Context, id, siteID string) (*domain.MeterType, error) {
			return &domain.MeterType{ID: id, SiteID: siteID, Name: "Su", Unit: "m³", IsActive: true}, nil
		},
		createConsumptionPeriodWithReadings: func(ctx context.Context, period *domain.ConsumptionPeriod, readings []domain.MeterReading) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
			period.ID = "period-1"
			return period, readings, nil
		},
	}

	var createdDebts []*domain.Debt
	debtRepo := &mockDebtRepository{
		createFn: func(ctx context.Context, debt *domain.Debt) (*domain.Debt, error) {
			createdDebts = append(createdDebts, debt)
			debt.ID = "debt-utility-1"
			return debt, nil
		},
	}

	svc := NewMeterService(meterRepo, aptRepo, debtRepo)

	// Fatura: 1000 TL, Ana Sayaç: 100 -> 200 (100 m³ tüketim) -> Birim fiyat = 10 TL/m³
	// Daire 1: 10 -> 40 (30 m³ tüketim) -> 300 TL (Bireysel Pay)
	// Daire 2: 20 -> 70 (50 m³ tüketim) -> 500 TL (Bireysel Pay)
	// Toplam daire tüketimi: 80 m³
	// Ortak alan: 100 - 80 = 20 m³ -> 200 TL (Site Yönetimi borcudur, dairelere paylaştırılmaz)
	// Daire 1 borç: 300 TL
	// Daire 2 borç: 500 TL
	// Toplam oluşturulan borç: 300 + 500 = 800 TL (TotalBillAmount - CommonAreaCost)
	payload := domain.CreateConsumptionPeriodPayload{
		MeterTypeID:       "mt-water",
		Period:            "2026-09",
		TotalBillAmount:   1000,
		MainMeterPrevious: 100,
		MainMeterCurrent:  200,
		Readings: []domain.ReadingInput{
			{ApartmentID: "apt-1", PreviousReading: 10, CurrentReading: 40},
			{ApartmentID: "apt-2", PreviousReading: 20, CurrentReading: 70},
		},
	}

	period, readings, err := svc.CreateConsumptionPeriod(ctx, "site-1", "admin-1", payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if period.UnitCost != 10 {
		t.Fatalf("expected unit cost 10, got %f", period.UnitCost)
	}
	if period.CommonAreaConsumption != 20 {
		t.Fatalf("expected common area consumption 20, got %f", period.CommonAreaConsumption)
	}
	if period.CommonAreaCost != 200 {
		t.Fatalf("expected common area cost 200, got %f", period.CommonAreaCost)
	}
	if len(readings) != 2 {
		t.Fatalf("expected 2 readings, got %d", len(readings))
	}

	// Verify total debt created equals individual consumption sum (TotalBillAmount - CommonAreaCost)
	var totalDebtCreated float64
	for _, d := range createdDebts {
		totalDebtCreated += d.Amount
	}

	expectedDebtTotal := payload.TotalBillAmount - period.CommonAreaCost
	if math.Abs(totalDebtCreated-expectedDebtTotal) > 0.001 {
		t.Fatalf("debts sum (%.2f) does not match expected individual total (%.2f)", totalDebtCreated, expectedDebtTotal)
	}
}

func TestMeterService_CreateConsumptionPeriod_Rounding(t *testing.T) {
	ctx := context.Background()

	ownerID1 := "owner-1"
	ownerID2 := "owner-2"

	apt1 := domain.Apartment{ID: "apt-1", SiteID: "site-1", DoorNumber: "1", OwnerUserID: &ownerID1}
	apt2 := domain.Apartment{ID: "apt-2", SiteID: "site-1", DoorNumber: "2", OwnerUserID: &ownerID2}

	aptRepo := &mockApartmentRepository{
		listApartmentsFn: func(ctx context.Context, siteID string) ([]domain.Apartment, error) {
			return []domain.Apartment{apt1, apt2}, nil
		},
	}

	meterRepo := &mockMeterRepository{
		getMeterTypeByIDFn: func(ctx context.Context, id, siteID string) (*domain.MeterType, error) {
			return &domain.MeterType{ID: id, SiteID: siteID, Name: "Su", Unit: "m³", IsActive: true}, nil
		},
		createConsumptionPeriodWithReadings: func(ctx context.Context, period *domain.ConsumptionPeriod, readings []domain.MeterReading) (*domain.ConsumptionPeriod, []domain.MeterReading, error) {
			period.ID = "period-2"
			return period, readings, nil
		},
	}

	var createdDebts []*domain.Debt
	debtRepo := &mockDebtRepository{
		createFn: func(ctx context.Context, debt *domain.Debt) (*domain.Debt, error) {
			createdDebts = append(createdDebts, debt)
			debt.ID = "debt-utility-round"
			return debt, nil
		},
	}

	svc := NewMeterService(meterRepo, aptRepo, debtRepo)

	// Fatura: 1000 TL, Ana Sayaç: 0 -> 300 (300 m³). Birim fiyat = 3.333333 TL/m³
	// Daire 1: 0 -> 100 (100 m³) -> 333.33 TL -> Yuvarlanmış: 333 TL
	// Daire 2: 0 -> 100 (100 m³) -> 333.33 TL -> Yuvarlanmış: 333 TL
	// Daireler borç toplamı: 333 + 333 = 666 TL (Tam sayı)
	// Ortak alan tüketimi: 300 - 200 = 100 m³
	// Ortak alan tutarı: 1000 - 666 = 334 TL (Yuvarlama farkı ortak alana yansır)
	// Daireler toplamı (666) + Ortak alan (334) = Fatura (1000)
	payload := domain.CreateConsumptionPeriodPayload{
		MeterTypeID:       "mt-water",
		Period:            "2026-09",
		TotalBillAmount:   1000,
		MainMeterPrevious: 0,
		MainMeterCurrent:  300,
		Readings: []domain.ReadingInput{
			{ApartmentID: "apt-1", PreviousReading: 0, CurrentReading: 100},
			{ApartmentID: "apt-2", PreviousReading: 0, CurrentReading: 100},
		},
	}

	period, readings, err := svc.CreateConsumptionPeriod(ctx, "site-1", "admin-1", payload)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, r := range readings {
		// Daire borçları tam sayı (virgülsüz) olmalıdır
		if r.IndividualAmount != math.Trunc(r.IndividualAmount) {
			t.Fatalf("reading individual amount should be integer, got %f", r.IndividualAmount)
		}
		if r.TotalAmount != math.Trunc(r.TotalAmount) {
			t.Fatalf("reading total amount should be integer, got %f", r.TotalAmount)
		}
	}

	if readings[0].IndividualAmount != 333 {
		t.Fatalf("expected reading 1 individual amount 333, got %f", readings[0].IndividualAmount)
	}
	if readings[1].IndividualAmount != 333 {
		t.Fatalf("expected reading 2 individual amount 333, got %f", readings[1].IndividualAmount)
	}

	// Ortak alan tutarı 334 TL olmalı
	if period.CommonAreaCost != 334 {
		t.Fatalf("expected common area cost 334, got %f", period.CommonAreaCost)
	}

	// Daireler toplamı + Ortak alan == Fatura tutarı
	var totalDebtCreated float64
	for _, d := range createdDebts {
		totalDebtCreated += d.Amount
	}

	if totalDebtCreated+period.CommonAreaCost != payload.TotalBillAmount {
		t.Fatalf("total debts (%.2f) + common area (%.2f) != bill amount (%.2f)",
			totalDebtCreated, period.CommonAreaCost, payload.TotalBillAmount)
	}
}

func TestMeterService_CreateMeterType_Validation(t *testing.T) {
	ctx := context.Background()

	svc := NewMeterService(&mockMeterRepository{}, &mockApartmentRepository{}, &mockDebtRepository{})

	t.Run("empty name returns error", func(t *testing.T) {
		_, err := svc.CreateMeterType(ctx, "site-1", "", "m³")
		if err == nil {
			t.Fatalf("expected error for empty name, got nil")
		}
	})

	t.Run("default unit is m3 if not provided", func(t *testing.T) {
		meterRepo := &mockMeterRepository{
			createMeterTypeFn: func(ctx context.Context, siteID, name, unit string, isActive bool) (*domain.MeterType, error) {
				if unit != "m³" {
					t.Fatalf("expected default unit m³, got %s", unit)
				}
				return &domain.MeterType{ID: "mt-1", Name: name, Unit: unit}, nil
			},
		}
		s := NewMeterService(meterRepo, &mockApartmentRepository{}, &mockDebtRepository{})
		mt, err := s.CreateMeterType(ctx, "site-1", "Elektrik", "")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if mt.Unit != "m³" {
			t.Fatalf("expected m³, got %s", mt.Unit)
		}
	})
}
