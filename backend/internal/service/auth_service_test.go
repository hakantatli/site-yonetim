package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/hakantatli/site-yonetim/internal/config"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"golang.org/x/crypto/bcrypt"
)

func newTestConfig() *config.Config {
	return &config.Config{
		JWTSecret:     "test-secret-key-1234567890123456",
		JWTAccessTTL:  15 * time.Minute,
		JWTRefreshTTL: 24 * time.Hour,
	}
}

func TestAuthService_Login(t *testing.T) {
	ctx := context.Background()
	cfg := newTestConfig()

	password := "Secret123!"
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt err: %v", err)
	}

	user := &domain.User{
		ID:       "user-1",
		FullName: "Test User",
		Phone:    "05551234567",
		Role:     domain.RoleResident,
		IsActive: true,
	}

	t.Run("successful login with valid credentials", func(t *testing.T) {
		userRepo := &mockUserRepository{
			getByPhoneOrEmailFn: func(ctx context.Context, identifier string) (*domain.User, string, error) {
				return user, string(hash), nil
			},
		}
		tokenRepo := &mockTokenRepository{
			createRefreshTokenFn: func(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
				return nil
			},
		}

		svc := NewAuthService(cfg, userRepo, tokenRepo)
		tokens, err := svc.Login(ctx, "05551234567", password)
		if err != nil {
			t.Fatalf("expected nil err, got %v", err)
		}
		if tokens.AccessToken == "" || tokens.RefreshToken == "" {
			t.Fatalf("expected non-empty tokens, got %+v", tokens)
		}
		if tokens.User.ID != user.ID {
			t.Fatalf("expected user %s, got %s", user.ID, tokens.User.ID)
		}
	})

	t.Run("login with wrong password returns ErrInvalidCredentials", func(t *testing.T) {
		userRepo := &mockUserRepository{
			getByPhoneOrEmailFn: func(ctx context.Context, identifier string) (*domain.User, string, error) {
				return user, string(hash), nil
			},
		}
		svc := NewAuthService(cfg, userRepo, &mockTokenRepository{})
		_, err := svc.Login(ctx, "05551234567", "wrong-password")
		if err != ErrInvalidCredentials {
			t.Fatalf("expected ErrInvalidCredentials, got %v", err)
		}
	})

	t.Run("login with inactive user returns ErrUserInactive", func(t *testing.T) {
		inactiveUser := *user
		inactiveUser.IsActive = false

		userRepo := &mockUserRepository{
			getByPhoneOrEmailFn: func(ctx context.Context, identifier string) (*domain.User, string, error) {
				return &inactiveUser, string(hash), nil
			},
		}
		svc := NewAuthService(cfg, userRepo, &mockTokenRepository{})
		_, err := svc.Login(ctx, "05551234567", password)
		if err != ErrUserInactive {
			t.Fatalf("expected ErrUserInactive, got %v", err)
		}
	})

	t.Run("login with empty identifier or password returns ErrInvalidCredentials", func(t *testing.T) {
		svc := NewAuthService(cfg, &mockUserRepository{}, &mockTokenRepository{})
		_, err := svc.Login(ctx, "", password)
		if err != ErrInvalidCredentials {
			t.Fatalf("expected ErrInvalidCredentials, got %v", err)
		}
		_, err = svc.Login(ctx, "05551234567", "")
		if err != ErrInvalidCredentials {
			t.Fatalf("expected ErrInvalidCredentials, got %v", err)
		}
	})
}

func TestAuthService_ValidateToken(t *testing.T) {
	ctx := context.Background()
	cfg := newTestConfig()

	user := &domain.User{
		ID:       "user-42",
		FullName: "Jane Doe",
		Phone:    "05559876543",
		Role:     domain.RoleAdmin,
		IsActive: true,
	}

	userRepo := &mockUserRepository{
		getByPhoneOrEmailFn: func(ctx context.Context, identifier string) (*domain.User, string, error) {
			hash, _ := bcrypt.GenerateFromPassword([]byte("pass"), bcrypt.MinCost)
			return user, string(hash), nil
		},
	}
	tokenRepo := &mockTokenRepository{}

	svc := NewAuthService(cfg, userRepo, tokenRepo)
	tokens, err := svc.Login(ctx, "05559876543", "pass")
	if err != nil {
		t.Fatalf("unexpected login err: %v", err)
	}

	claims, err := svc.ValidateToken(tokens.AccessToken)
	if err != nil {
		t.Fatalf("expected valid token, got %v", err)
	}
	if claims.UserID != user.ID || claims.Role != domain.RoleAdmin {
		t.Fatalf("claims mismatch: %+v", claims)
	}

	// Tampered token
	_, err = svc.ValidateToken(tokens.AccessToken + "tampered")
	if err == nil {
		t.Fatalf("expected error for tampered token, got nil")
	}
}

func TestAuthService_ChangePassword(t *testing.T) {
	ctx := context.Background()
	cfg := newTestConfig()

	oldPass := "OldPass123!"
	oldHash, err := bcrypt.GenerateFromPassword([]byte(oldPass), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt err: %v", err)
	}

	t.Run("fails when new password is too short", func(t *testing.T) {
		svc := NewAuthService(cfg, &mockUserRepository{}, &mockTokenRepository{})
		_, err := svc.ChangePassword(ctx, "user-1", domain.ChangePasswordRequest{
			NewPassword: "123",
		})
		if err != ErrPasswordTooShort {
			t.Fatalf("expected ErrPasswordTooShort, got %v", err)
		}
	})

	t.Run("fails when user is a demo account", func(t *testing.T) {
		demoAdmin := &domain.User{
			ID:                 "demo-admin",
			Phone:              "05551234567",
			IsActive:           true,
			MustChangePassword: false,
		}
		userRepo := &mockUserRepository{
			getByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
				return demoAdmin, nil
			},
		}
		svc := NewAuthService(cfg, userRepo, nil)
		_, err := svc.ChangePassword(ctx, "demo-admin", domain.ChangePasswordRequest{
			NewPassword: "AttemptedNewPassword123!",
		})
		if !errors.Is(err, ErrDemoAccountPasswordChange) {
			t.Fatalf("expected ErrDemoAccountPasswordChange, got: %v", err)
		}

		demoResident := &domain.User{
			ID:                 "demo-resident",
			Phone:              "05423010001",
			IsActive:           true,
			MustChangePassword: false,
		}
		userRepo.getByIDFn = func(ctx context.Context, id string) (*domain.User, error) {
			return demoResident, nil
		}
		_, err = svc.ChangePassword(ctx, "demo-resident", domain.ChangePasswordRequest{
			NewPassword: "AttemptedNewPassword123!",
		})
		if !errors.Is(err, ErrDemoAccountPasswordChange) {
			t.Fatalf("expected ErrDemoAccountPasswordChange for resident, got: %v", err)
		}
	})

	t.Run("requires and validates current password when MustChangePassword is false", func(t *testing.T) {
		user := &domain.User{
			ID:                 "user-1",
			Phone:              "05551112233",
			IsActive:           true,
			MustChangePassword: false,
		}

		userRepo := &mockUserRepository{
			getByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
				return user, nil
			},
			getByPhoneOrEmailFn: func(ctx context.Context, identifier string) (*domain.User, string, error) {
				return user, string(oldHash), nil
			},
		}

		svc := NewAuthService(cfg, userRepo, &mockTokenRepository{})

		// Missing current password
		_, err := svc.ChangePassword(ctx, "user-1", domain.ChangePasswordRequest{
			NewPassword: "NewSecret123!",
		})
		if err != ErrInvalidCurrentPassword {
			t.Fatalf("expected ErrInvalidCurrentPassword, got %v", err)
		}

		// Wrong current password
		wrongPass := "WrongPass123!"
		_, err = svc.ChangePassword(ctx, "user-1", domain.ChangePasswordRequest{
			CurrentPassword: &wrongPass,
			NewPassword:     "NewSecret123!",
		})
		if err != ErrInvalidCurrentPassword {
			t.Fatalf("expected ErrInvalidCurrentPassword, got %v", err)
		}

		// Correct current password
		pwdUpdated := false
		var passedFlag bool
		userRepo.updateUserPasswordFn = func(ctx context.Context, id string, passwordHash string, mustChangePassword bool) error {
			pwdUpdated = true
			passedFlag = mustChangePassword
			return nil
		}
		tokenRepo := &mockTokenRepository{
			createRefreshTokenFn: func(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
				return nil
			},
		}

		svc = NewAuthService(cfg, userRepo, tokenRepo)
		tokens, err := svc.ChangePassword(ctx, "user-1", domain.ChangePasswordRequest{
			CurrentPassword: &oldPass,
			NewPassword:     "NewSecret123!",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !pwdUpdated || passedFlag {
			t.Fatalf("expected password update with mustChangePassword=false")
		}
		if tokens.User.MustChangePassword {
			t.Fatalf("expected tokens.User.MustChangePassword to be false")
		}
	})

	t.Run("allows changing password without current password when MustChangePassword is true", func(t *testing.T) {
		user := &domain.User{
			ID:                 "user-res",
			Phone:              "05559998877",
			IsActive:           true,
			MustChangePassword: true,
		}

		pwdUpdated := false
		userRepo := &mockUserRepository{
			getByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
				return user, nil
			},
			updateUserPasswordFn: func(ctx context.Context, id string, passwordHash string, mustChangePassword bool) error {
				pwdUpdated = true
				if mustChangePassword {
					t.Errorf("expected mustChangePassword to be false after change")
				}
				return nil
			},
		}
		tokenRepo := &mockTokenRepository{
			createRefreshTokenFn: func(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
				return nil
			},
		}

		svc := NewAuthService(cfg, userRepo, tokenRepo)
		tokens, err := svc.ChangePassword(ctx, "user-res", domain.ChangePasswordRequest{
			NewPassword: "BrandNewPassword123!",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !pwdUpdated {
			t.Fatalf("expected updateUserPassword to be called")
		}
		if tokens.User.MustChangePassword {
			t.Fatalf("expected returned user to have MustChangePassword=false")
		}
	})
}

func TestAuthService_DismissPasswordChange(t *testing.T) {
	ctx := context.Background()
	cfg := newTestConfig()

	user := &domain.User{
		ID:                 "user-res",
		IsActive:           true,
		MustChangePassword: true,
	}

	flagSet := false
	userRepo := &mockUserRepository{
		getByIDFn: func(ctx context.Context, id string) (*domain.User, error) {
			return user, nil
		},
		setMustChangePasswordFn: func(ctx context.Context, id string, mustChangePassword bool) error {
			if !mustChangePassword {
				flagSet = true
			}
			return nil
		},
	}

	svc := NewAuthService(cfg, userRepo, &mockTokenRepository{})
	err := svc.DismissPasswordChange(ctx, "user-res")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !flagSet {
		t.Fatalf("expected setMustChangePasswordFn to be called with false")
	}
}

func TestAuthService_RegisterAdmin(t *testing.T) {
	ctx := context.Background()
	cfg := newTestConfig()

	t.Run("valid registration creates site with limit 10, creates admin, and returns tokens", func(t *testing.T) {
		siteCreated := false
		var createdSiteLimit int32
		catsCreated := false
		adminAdded := false

		siteRepo := &mockSiteRepository{
			createFn: func(ctx context.Context, name string, address *string, limit int32) (*domain.Site, error) {
				siteCreated = true
				createdSiteLimit = limit
				return &domain.Site{
					ID:             "site-10",
					Name:           name,
					ApartmentLimit: limit,
				}, nil
			},
			createDefaultCatsFn: func(ctx context.Context, siteID string) error {
				catsCreated = true
				return nil
			},
			addAdminFn: func(ctx context.Context, siteID string, userID string) error {
				if siteID == "site-10" && userID == "user-admin-1" {
					adminAdded = true
				}
				return nil
			},
		}

		userRepo := &mockUserRepository{
			getByPhoneFn: func(ctx context.Context, phone string) (*domain.User, string, error) {
				return nil, "", nil
			},
			createFn: func(ctx context.Context, user *domain.User, passwordHash string) (*domain.User, error) {
				if user.Role != domain.RoleAdmin {
					t.Errorf("expected role admin, got %s", user.Role)
				}
				if *user.SiteID != "site-10" {
					t.Errorf("expected site_id site-10, got %s", *user.SiteID)
				}
				return &domain.User{
					ID:       "user-admin-1",
					SiteID:   user.SiteID,
					Phone:    user.Phone,
					Email:    user.Email,
					FullName: user.FullName,
					Role:     user.Role,
					IsActive: true,
				}, nil
			},
		}

		tokenRepo := &mockTokenRepository{
			createRefreshTokenFn: func(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
				return nil
			},
		}

		svc := NewAuthService(cfg, userRepo, tokenRepo, siteRepo)

		email := "admin@example.com"
		address := "Kadıköy / İstanbul"
		req := domain.RegisterAdminRequest{
			FullName:    "Ahmet Yılmaz",
			Phone:       "0555 111 22 33",
			Email:       &email,
			Password:    "Secret123!",
			SiteName:    "Güneş Sitesi",
			SiteAddress: &address,
		}

		tokens, err := svc.RegisterAdmin(ctx, req)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if !siteCreated || createdSiteLimit != 10 {
			t.Errorf("expected site to be created with apartment limit 10")
		}
		if !catsCreated {
			t.Errorf("expected default categories to be created")
		}
		if !adminAdded {
			t.Errorf("expected admin to be linked to site")
		}
		if tokens == nil || tokens.AccessToken == "" || tokens.RefreshToken == "" {
			t.Errorf("expected non-empty tokens, got %+v", tokens)
		}
		if tokens.User.ID != "user-admin-1" || tokens.User.Role != domain.RoleAdmin {
			t.Errorf("user mismatch in tokens: %+v", tokens.User)
		}
	})

	t.Run("duplicate phone returns ErrPhoneAlreadyExists", func(t *testing.T) {
		siteRepo := &mockSiteRepository{}
		userRepo := &mockUserRepository{
			getByPhoneFn: func(ctx context.Context, phone string) (*domain.User, string, error) {
				return &domain.User{
					ID:    "existing-user",
					Phone: phone,
				}, "hash", nil
			},
		}

		svc := NewAuthService(cfg, userRepo, &mockTokenRepository{}, siteRepo)
		req := domain.RegisterAdminRequest{
			FullName: "Ahmet Yılmaz",
			Phone:    "0555 111 22 33",
			Password: "Secret123!",
			SiteName: "Güneş Sitesi",
		}

		_, err := svc.RegisterAdmin(ctx, req)
		if err != ErrPhoneAlreadyExists {
			t.Fatalf("expected ErrPhoneAlreadyExists, got %v", err)
		}
	})

	t.Run("short password returns ErrPasswordTooShort", func(t *testing.T) {
		siteRepo := &mockSiteRepository{}
		userRepo := &mockUserRepository{
			getByPhoneFn: func(ctx context.Context, phone string) (*domain.User, string, error) {
				return nil, "", nil
			},
		}

		svc := NewAuthService(cfg, userRepo, &mockTokenRepository{}, siteRepo)
		req := domain.RegisterAdminRequest{
			FullName: "Ahmet Yılmaz",
			Phone:    "0555 111 22 33",
			Password: "123",
			SiteName: "Güneş Sitesi",
		}

		_, err := svc.RegisterAdmin(ctx, req)
		if err != ErrPasswordTooShort {
			t.Fatalf("expected ErrPasswordTooShort, got %v", err)
		}
	})

	t.Run("missing required fields returns ErrRegistrationInput", func(t *testing.T) {
		siteRepo := &mockSiteRepository{}
		userRepo := &mockUserRepository{}

		svc := NewAuthService(cfg, userRepo, &mockTokenRepository{}, siteRepo)

		// Missing FullName
		_, err := svc.RegisterAdmin(ctx, domain.RegisterAdminRequest{
			FullName: "   ",
			Phone:    "0555 111 22 33",
			Password: "Secret123!",
			SiteName: "Güneş Sitesi",
		})
		if err != ErrRegistrationInput {
			t.Errorf("expected ErrRegistrationInput for empty FullName, got %v", err)
		}

		// Missing SiteName
		_, err = svc.RegisterAdmin(ctx, domain.RegisterAdminRequest{
			FullName: "Ahmet Yılmaz",
			Phone:    "0555 111 22 33",
			Password: "Secret123!",
			SiteName: "  ",
		})
		if err != ErrRegistrationInput {
			t.Errorf("expected ErrRegistrationInput for empty SiteName, got %v", err)
		}

		// Missing Phone
		_, err = svc.RegisterAdmin(ctx, domain.RegisterAdminRequest{
			FullName: "Ahmet Yılmaz",
			Phone:    "",
			Password: "Secret123!",
			SiteName: "Güneş Sitesi",
		})
		if err != ErrRegistrationInput {
			t.Errorf("expected ErrRegistrationInput for empty Phone, got %v", err)
		}
	})
}

