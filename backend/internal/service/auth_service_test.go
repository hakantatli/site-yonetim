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
