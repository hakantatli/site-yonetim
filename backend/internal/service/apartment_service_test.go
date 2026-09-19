package service

import (
	"context"
	"testing"

	"github.com/hakantatli/site-yonetim/internal/domain"
)

func TestApartmentService_CreateApartment_LimitCheck(t *testing.T) {
	ctx := context.Background()

	site := &domain.Site{
		ID:             "site-1",
		Name:           "Palmiye Sitesi",
		ApartmentLimit: 10, // freemium limit
	}

	siteRepo := &mockSiteRepository{
		getByIDFn: func(ctx context.Context, id string) (*domain.Site, error) {
			return site, nil
		},
	}

	t.Run("creating apartment when active count is within limit succeeds", func(t *testing.T) {
		aptRepo := &mockApartmentRepository{
			countActiveApartmentsFn: func(ctx context.Context, siteID string) (int64, error) {
				return 9, nil // 9 < 10
			},
			createApartmentFn: func(ctx context.Context, siteID string, blockID *string, doorNumber string, floor *int32, ownerUserID *string, tenantUserID *string) (*domain.Apartment, error) {
				return &domain.Apartment{ID: "apt-10", DoorNumber: doorNumber}, nil
			},
			getApartmentByIDFn: func(ctx context.Context, id string, siteID string) (*domain.Apartment, error) {
				return &domain.Apartment{ID: id, DoorNumber: "10"}, nil
			},
		}

		svc := NewApartmentService(aptRepo, siteRepo, &mockUserRepository{})
		apt, err := svc.CreateApartment(ctx, "site-1", domain.CreateApartmentRequest{DoorNumber: "10"}, nil)
		if err != nil {
			t.Fatalf("expected nil err, got %v", err)
		}
		if apt.DoorNumber != "10" {
			t.Fatalf("expected door number 10, got %s", apt.DoorNumber)
		}
	})

	t.Run("creating apartment when active count reaches limit returns ErrLimitExceeded", func(t *testing.T) {
		aptRepo := &mockApartmentRepository{
			countActiveApartmentsFn: func(ctx context.Context, siteID string) (int64, error) {
				return 10, nil // 10 >= 10 limit
			},
		}

		svc := NewApartmentService(aptRepo, siteRepo, &mockUserRepository{})
		_, err := svc.CreateApartment(ctx, "site-1", domain.CreateApartmentRequest{DoorNumber: "11"}, nil)
		if err != ErrLimitExceeded {
			t.Fatalf("expected ErrLimitExceeded, got %v", err)
		}
	})
}

func TestApartmentService_RemoveTenant_DebtActions(t *testing.T) {
	ctx := context.Background()

	siteRepo := &mockSiteRepository{}
	userRepo := &mockUserRepository{}

	ownerID := "user-owner"
	tenantID := "user-tenant"

	aptWithTenant := &domain.Apartment{
		ID:           "apt-1",
		SiteID:       "site-1",
		DoorNumber:   "5",
		OwnerUserID:  &ownerID,
		TenantUserID: &tenantID,
	}

	t.Run("debt_action: keep leaves debts as is", func(t *testing.T) {
		transferCalled := false
		deleteCalled := false

		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id string, siteID string) (*domain.Apartment, error) {
				return aptWithTenant, nil
			},
			transferOpenDebtsToOwnerFn: func(ctx context.Context, apartmentID string, oldDebtorID string, newDebtorID string) error {
				transferCalled = true
				return nil
			},
			deleteOpenDebtsByDebtorFn: func(ctx context.Context, apartmentID string, debtorID string) error {
				deleteCalled = true
				return nil
			},
		}

		svc := NewApartmentService(aptRepo, siteRepo, userRepo)
		_, err := svc.RemoveTenant(ctx, "site-1", "apt-1", domain.RemoveTenantRequest{
			DebtAction: "keep",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if transferCalled || deleteCalled {
			t.Fatalf("expected neither transfer nor delete for 'keep'")
		}
	})

	t.Run("debt_action: transfer calls TransferOpenDebtsToOwner", func(t *testing.T) {
		transferCalled := false

		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id string, siteID string) (*domain.Apartment, error) {
				return aptWithTenant, nil
			},
			transferOpenDebtsToOwnerFn: func(ctx context.Context, apartmentID string, oldDebtorID string, newDebtorID string) error {
				transferCalled = true
				if oldDebtorID != tenantID || newDebtorID != ownerID {
					t.Fatalf("wrong debtors: old=%s, new=%s", oldDebtorID, newDebtorID)
				}
				return nil
			},
		}

		svc := NewApartmentService(aptRepo, siteRepo, userRepo)
		_, err := svc.RemoveTenant(ctx, "site-1", "apt-1", domain.RemoveTenantRequest{
			DebtAction: "transfer",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !transferCalled {
			t.Fatalf("expected transferOpenDebtsToOwner to be called")
		}
	})

	t.Run("debt_action: delete calls DeleteOpenDebtsByDebtor", func(t *testing.T) {
		deleteCalled := false

		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id string, siteID string) (*domain.Apartment, error) {
				return aptWithTenant, nil
			},
			deleteOpenDebtsByDebtorFn: func(ctx context.Context, apartmentID string, debtorID string) error {
				deleteCalled = true
				if debtorID != tenantID {
					t.Fatalf("wrong debtor: %s", debtorID)
				}
				return nil
			},
		}

		svc := NewApartmentService(aptRepo, siteRepo, userRepo)
		_, err := svc.RemoveTenant(ctx, "site-1", "apt-1", domain.RemoveTenantRequest{
			DebtAction: "delete",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !deleteCalled {
			t.Fatalf("expected DeleteOpenDebtsByDebtor to be called")
		}
	})

	t.Run("invalid debt action returns ErrInvalidDebtAction", func(t *testing.T) {
		aptRepo := &mockApartmentRepository{
			getApartmentByIDFn: func(ctx context.Context, id string, siteID string) (*domain.Apartment, error) {
				return aptWithTenant, nil
			},
		}
		svc := NewApartmentService(aptRepo, siteRepo, userRepo)
		_, err := svc.RemoveTenant(ctx, "site-1", "apt-1", domain.RemoveTenantRequest{
			DebtAction: "invalid_action",
		})
		if err != ErrInvalidDebtAction {
			t.Fatalf("expected ErrInvalidDebtAction, got %v", err)
		}
	})
}
