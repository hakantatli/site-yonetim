package service

import (
	"context"
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

