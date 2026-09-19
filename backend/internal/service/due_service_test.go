package service

import (
	"context"
	"testing"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestDueService_CreateManualDebt(t *testing.T) {
	ctx := context.Background()

	ownerID := "user-owner-1"
	tenantID := "user-tenant-1"

	aptWithBoth := &domain.Apartment{
		ID:           "apt-1",
		SiteID:       "site-1",
		DoorNumber:   "3",
		OwnerUserID:  &ownerID,
		TenantUserID: &tenantID,
	}

	aptOwnerOnly := &domain.Apartment{
		ID:           "apt-2",
		SiteID:       "site-1",
		DoorNumber:   "4",
		OwnerUserID:  &ownerID,
		TenantUserID: nil,
	}

	aptEmpty := &domain.Apartment{
		ID:           "apt-3",
		SiteID:       "site-1",
		DoorNumber:   "5",
		OwnerUserID:  nil,
		TenantUserID: nil,
	}

	t.Run("fixture or investment debt is always assigned to owner, even if tenant exists", func(t *testing.T) {
		var capturedDebtorID string
		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id, siteID string) (*domain.Apartment, error) {
				return aptWithBoth, nil
			},
		}
		debtRepo := &mockDebtRepository{
			createFn: func(ctx context.Context, debt *domain.Debt) (*domain.Debt, error) {
				capturedDebtorID = debt.DebtorUserID
				debt.ID = "debt-fixture-1"
				return debt, nil
			},
		}

		svc := NewDueService(&mockDueRepository{}, debtRepo, aptRepo, &mockSiteRepository{})
		debt, err := svc.CreateManualDebt(ctx, "site-1", "admin-1", domain.CreateManualDebtRequest{
			ApartmentID: "apt-1",
			Type:        domain.DebtTypeFixture,
			Amount:      2500,
			Description: "Asansör Motor Değişimi",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if debt.DebtorUserID != ownerID || capturedDebtorID != ownerID {
			t.Fatalf("expected debtor to be owner %s, got %s", ownerID, debt.DebtorUserID)
		}
	})

	t.Run("fixture debt without owner returns ErrOwnerRequiredForFixture", func(t *testing.T) {
		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id, siteID string) (*domain.Apartment, error) {
				return aptEmpty, nil
			},
		}

		svc := NewDueService(&mockDueRepository{}, &mockDebtRepository{}, aptRepo, &mockSiteRepository{})
		_, err := svc.CreateManualDebt(ctx, "site-1", "admin-1", domain.CreateManualDebtRequest{
			ApartmentID: "apt-3",
			Type:        domain.DebtTypeFixture,
			Amount:      1000,
			Description: "Asansör Bakımı",
		})
		if err != ErrOwnerRequiredForFixture {
			t.Fatalf("expected ErrOwnerRequiredForFixture, got %v", err)
		}
	})

	t.Run("non-fixture debt prefers tenant if tenant exists", func(t *testing.T) {
		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id, siteID string) (*domain.Apartment, error) {
				return aptWithBoth, nil
			},
		}
		debtRepo := &mockDebtRepository{
			createFn: func(ctx context.Context, debt *domain.Debt) (*domain.Debt, error) {
				debt.ID = "debt-other-1"
				return debt, nil
			},
		}

		svc := NewDueService(&mockDueRepository{}, debtRepo, aptRepo, &mockSiteRepository{})
		debt, err := svc.CreateManualDebt(ctx, "site-1", "admin-1", domain.CreateManualDebtRequest{
			ApartmentID: "apt-1",
			Type:        domain.DebtTypeOther,
			Amount:      350,
			Description: "Ortak Bahçe Temizlik Payı",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if debt.DebtorUserID != tenantID {
			t.Fatalf("expected debtor to be tenant %s, got %s", tenantID, debt.DebtorUserID)
		}
	})

	t.Run("non-fixture debt falls back to owner if no tenant", func(t *testing.T) {
		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id, siteID string) (*domain.Apartment, error) {
				return aptOwnerOnly, nil
			},
		}
		debtRepo := &mockDebtRepository{
			createFn: func(ctx context.Context, debt *domain.Debt) (*domain.Debt, error) {
				debt.ID = "debt-other-2"
				return debt, nil
			},
		}

		svc := NewDueService(&mockDueRepository{}, debtRepo, aptRepo, &mockSiteRepository{})
		debt, err := svc.CreateManualDebt(ctx, "site-1", "admin-1", domain.CreateManualDebtRequest{
			ApartmentID: "apt-2",
			Type:        domain.DebtTypeOther,
			Amount:      350,
			Description: "Ortak Bahçe Temizlik Payı",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if debt.DebtorUserID != ownerID {
			t.Fatalf("expected debtor to be owner %s, got %s", ownerID, debt.DebtorUserID)
		}
	})

	t.Run("amount <= 0 returns ErrInvalidDebtAmount", func(t *testing.T) {
		svc := NewDueService(&mockDueRepository{}, &mockDebtRepository{}, &mockApartmentRepository{}, &mockSiteRepository{})
		_, err := svc.CreateManualDebt(ctx, "site-1", "admin-1", domain.CreateManualDebtRequest{
			ApartmentID: "apt-1",
			Type:        domain.DebtTypeOther,
			Amount:      0,
		})
		if err != ErrInvalidDebtAmount {
			t.Fatalf("expected ErrInvalidDebtAmount, got %v", err)
		}
	})
}

func TestDueService_AccrueMonthlyDuesForSite(t *testing.T) {
	ctx := context.Background()

	dueRepo := &mockDueRepository{
		getCurrentFn: func(ctx context.Context, siteID string, targetDate string) (*domain.DueRate, error) {
			return &domain.DueRate{Amount: 1500, ValidFrom: "2026-01-01"}, nil
		},
	}

	// UUIDs for 2 apartments
	var apt1UUID, apt2UUID, ownerUUID, tenantUUID pgtype.UUID
	_ = apt1UUID.Scan("11111111-1111-1111-1111-111111111111")
	_ = apt2UUID.Scan("22222222-2222-2222-2222-222222222222")
	_ = ownerUUID.Scan("33333333-3333-3333-3333-333333333333")
	_ = tenantUUID.Scan("44444444-4444-4444-4444-444444444444")

	accruedDebtors := make(map[string]string)
	debtRepo := &mockDebtRepository{
		listActiveApartmentsForAccrualFn: func(ctx context.Context, siteID string) ([]db.ListActiveApartmentsForAccrualRow, error) {
			return []db.ListActiveApartmentsForAccrualRow{
				{
					ID:           apt1UUID,
					TenantUserID: tenantUUID,
					OwnerUserID:  ownerUUID,
				},
				{
					ID:           apt2UUID,
					TenantUserID: pgtype.UUID{Valid: false}, // empty tenant
					OwnerUserID:  ownerUUID,
				},
			}, nil
		},
		accrueMonthlyDueFn: func(ctx context.Context, siteID, apartmentID, debtorUserID string, amount float64, dueMonth string, description string, createdBy *string) (string, error) {
			accruedDebtors[apartmentID] = debtorUserID
			return "accrued-id", nil
		},
	}

	svc := NewDueService(dueRepo, debtRepo, &mockApartmentRepository{}, &mockSiteRepository{})
	targetMonth := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	res, err := svc.AccrueMonthlyDuesForSite(ctx, "site-1", targetMonth, nil)
	if err != nil {
		t.Fatalf("unexpected accrual err: %v", err)
	}

	if res.CreatedCount != 2 {
		t.Fatalf("expected 2 created dues, got %d", res.CreatedCount)
	}

	// Verify debtor choice: Apt 1 -> Tenant, Apt 2 -> Owner
	if accruedDebtors["11111111-1111-1111-1111-111111111111"] != "44444444-4444-4444-4444-444444444444" {
		t.Fatalf("apt 1 should have accrued to tenant")
	}
	if accruedDebtors["22222222-2222-2222-2222-222222222222"] != "33333333-3333-3333-3333-333333333333" {
		t.Fatalf("apt 2 should have accrued to owner")
	}
}
