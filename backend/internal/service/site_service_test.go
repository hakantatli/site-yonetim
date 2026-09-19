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
