package service

import (
	"context"
	"testing"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

func TestSiteService_CreateSite(t *testing.T) {
	ctx := context.Background()

	t.Run("successful site creation with default limit 10", func(t *testing.T) {
		defaultCategoriesSeeded := false
		siteRepo := &mockSiteRepository{
			createFn: func(ctx context.Context, name string, address *string, limit int32) (*domain.Site, error) {
				if limit != 10 {
					t.Fatalf("expected default limit 10, got %d", limit)
				}
				return &domain.Site{
					ID:             "site-1",
					Name:           name,
					ApartmentLimit: limit,
				}, nil
			},
			createDefaultCatsFn: func(ctx context.Context, siteID string) error {
				defaultCategoriesSeeded = true
				return nil
			},
		}

		svc := NewSiteService(siteRepo, &mockUserRepository{})
		site, err := svc.CreateSite(ctx, domain.CreateSiteRequest{
			Name: "Gül Apartmanı",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if site.Name != "Gül Apartmanı" || site.ApartmentLimit != 10 {
			t.Fatalf("mismatched site: %+v", site)
		}
		if !defaultCategoriesSeeded {
			t.Fatalf("expected default categories to be seeded")
		}
	})

	t.Run("empty name returns ErrInvalidSiteInput", func(t *testing.T) {
		svc := NewSiteService(&mockSiteRepository{}, &mockUserRepository{})
		_, err := svc.CreateSite(ctx, domain.CreateSiteRequest{Name: ""})
		if err != ErrInvalidSiteInput {
			t.Fatalf("expected ErrInvalidSiteInput, got %v", err)
		}
	})

	t.Run("limit < 1 returns ErrInvalidLimit", func(t *testing.T) {
		svc := NewSiteService(&mockSiteRepository{}, &mockUserRepository{})
		zero := int32(0)
		_, err := svc.CreateSite(ctx, domain.CreateSiteRequest{Name: "Palmiye Sitesi", ApartmentLimit: &zero})
		if err != ErrInvalidLimit {
			t.Fatalf("expected ErrInvalidLimit, got %v", err)
		}
	})
}

func TestSiteService_CreateAdmin(t *testing.T) {
	ctx := context.Background()

	siteRepo := &mockSiteRepository{
		getByIDFn: func(ctx context.Context, id string) (*domain.Site, error) {
			return &domain.Site{ID: id, Name: "Site A"}, nil
		},
	}

	t.Run("successful admin creation with bcrypt hash", func(t *testing.T) {
		var capturedHash string
		userRepo := &mockUserRepository{
			getByPhoneFn: func(ctx context.Context, phone string) (*domain.User, string, error) {
				return nil, "", nil
			},
			createFn: func(ctx context.Context, user *domain.User, passwordHash string) (*domain.User, error) {
				capturedHash = passwordHash
				user.ID = "admin-1"
				return user, nil
			},
		}

		svc := NewSiteService(siteRepo, userRepo)
		admin, err := svc.CreateAdmin(ctx, "site-1", domain.CreateAdminRequest{
			FullName: "Yönetici Ahmet",
			Phone:    "05321112233",
			Password: "AdminPassword123!",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if admin.Role != domain.RoleAdmin || admin.FullName != "Yönetici Ahmet" {
			t.Fatalf("mismatched admin: %+v", admin)
		}
		// Verify bcrypt hash
		if err := bcrypt.CompareHashAndPassword([]byte(capturedHash), []byte("AdminPassword123!")); err != nil {
			t.Fatalf("password hash mismatch: %v", err)
		}
	})

	t.Run("phone already exists returns ErrAdminPhoneExists", func(t *testing.T) {
		userRepo := &mockUserRepository{
			getByPhoneFn: func(ctx context.Context, phone string) (*domain.User, string, error) {
				return &domain.User{ID: "existing-user", Phone: phone}, "", nil
			},
		}
		svc := NewSiteService(siteRepo, userRepo)
		_, err := svc.CreateAdmin(ctx, "site-1", domain.CreateAdminRequest{
			FullName: "Yeni Yönetici",
			Phone:    "05321112233",
			Password: "Pass",
		})
		if err != ErrAdminPhoneExists {
			t.Fatalf("expected ErrAdminPhoneExists, got %v", err)
		}
	})
}

func TestSiteService_CreateSiteForAdmin(t *testing.T) {
	ctx := context.Background()

	t.Run("enforces limit 10, seeds categories, adds admin, and updates user site_id", func(t *testing.T) {
		defaultCategoriesSeeded := false
		adminAddedSiteID := ""
		adminAddedUserID := ""
		userSiteIDUpdated := ""

		siteRepo := &mockSiteRepository{
			createFn: func(ctx context.Context, name string, address *string, limit int32) (*domain.Site, error) {
				if limit != 10 {
					t.Fatalf("expected limit 10, got %d", limit)
				}
				return &domain.Site{
					ID:             "site-new-1",
					Name:           name,
					ApartmentLimit: limit,
				}, nil
			},
			createDefaultCatsFn: func(ctx context.Context, siteID string) error {
				defaultCategoriesSeeded = true
				return nil
			},
			addAdminFn: func(ctx context.Context, siteID string, userID string) error {
				adminAddedSiteID = siteID
				adminAddedUserID = userID
				return nil
			},
		}

		userRepo := &mockUserRepository{
			getByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
				return &domain.User{
					ID:     id,
					SiteID: nil,
				}, nil
			},
			updateSiteIDFn: func(ctx context.Context, userID string, siteID string) error {
				userSiteIDUpdated = siteID
				return nil
			},
		}

		svc := NewSiteService(siteRepo, userRepo)
		site, err := svc.CreateSiteForAdmin(ctx, "user-admin-1", domain.CreateAdminSiteRequest{
			Name: "Kardelen Sitesi",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if site.ApartmentLimit != 10 {
			t.Fatalf("expected limit 10, got %d", site.ApartmentLimit)
		}
		if site.AdminCount != 1 {
			t.Fatalf("expected AdminCount 1, got %d", site.AdminCount)
		}
		if !defaultCategoriesSeeded {
			t.Fatalf("expected default categories to be seeded")
		}
		if adminAddedSiteID != "site-new-1" || adminAddedUserID != "user-admin-1" {
			t.Fatalf("expected admin linked to site-new-1, got site=%s user=%s", adminAddedSiteID, adminAddedUserID)
		}
		if userSiteIDUpdated != "site-new-1" {
			t.Fatalf("expected user site_id updated to site-new-1, got %s", userSiteIDUpdated)
		}
	})

	t.Run("empty site name returns ErrInvalidSiteInput", func(t *testing.T) {
		svc := NewSiteService(&mockSiteRepository{}, &mockUserRepository{})
		_, err := svc.CreateSiteForAdmin(ctx, "user-admin-1", domain.CreateAdminSiteRequest{Name: "   "})
		if err != ErrInvalidSiteInput {
			t.Fatalf("expected ErrInvalidSiteInput, got %v", err)
		}
	})
}

func TestSiteService_ListSitesByAdminAndIsUserAdminOfSite(t *testing.T) {
	ctx := context.Background()

	adminSites := []domain.Site{
		{ID: "site-1", Name: "Site Bir"},
		{ID: "site-2", Name: "Site İki"},
	}

	siteRepo := &mockSiteRepository{
		listByAdminIDFn: func(ctx context.Context, userID string) ([]domain.Site, error) {
			if userID == "admin-1" {
				return adminSites, nil
			}
			return []domain.Site{}, nil
		},
		isUserAdminOfSiteFn: func(ctx context.Context, siteID string, userID string) (bool, error) {
			if userID == "admin-1" && (siteID == "site-1" || siteID == "site-2") {
				return true, nil
			}
			return false, nil
		},
	}

	svc := NewSiteService(siteRepo, &mockUserRepository{})

	t.Run("ListSitesByAdmin returns admin sites", func(t *testing.T) {
		sites, err := svc.ListSitesByAdmin(ctx, "admin-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(sites) != 2 {
			t.Fatalf("expected 2 sites, got %d", len(sites))
		}
	})

	t.Run("IsUserAdminOfSite returns true for administered site and false for another", func(t *testing.T) {
		isAdmin, err := svc.IsUserAdminOfSite(ctx, "site-1", "admin-1")
		if err != nil || !isAdmin {
			t.Fatalf("expected true, got %v (err: %v)", isAdmin, err)
		}

		isAdminOther, err := svc.IsUserAdminOfSite(ctx, "site-3", "admin-1")
		if err != nil || isAdminOther {
			t.Fatalf("expected false, got %v (err: %v)", isAdminOther, err)
		}
	})
}
