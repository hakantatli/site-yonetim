package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/hakantatli/site-yonetim/internal/config"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("geçersiz telefon numarası / e-posta veya şifre")
	ErrUserInactive       = errors.New("kullanıcı hesabı pasif durumda")
	ErrInvalidToken       = errors.New("geçersiz veya süresi dolmuş oturum")
)

type JWTClaims struct {
	UserID string          `json:"user_id"`
	Phone  string          `json:"phone"`
	Email  *string         `json:"email,omitempty"`
	Role   domain.UserRole `json:"role"`
	SiteID *string         `json:"site_id,omitempty"`
	jwt.RegisteredClaims
}

type AuthService interface {
	Login(ctx context.Context, identifier, password string) (*domain.TokenPair, error)
	Refresh(ctx context.Context, rawRefreshToken string) (*domain.TokenPair, error)
	Logout(ctx context.Context, rawRefreshToken string) error
	ValidateToken(tokenString string) (*JWTClaims, error)
	SeedOwnerIfEmpty(ctx context.Context, phone string, email *string, password string, fullName string) error
}

type authService struct {
	cfg       *config.Config
	userRepo  repository.UserRepository
	tokenRepo repository.TokenRepository
}

func NewAuthService(cfg *config.Config, userRepo repository.UserRepository, tokenRepo repository.TokenRepository) AuthService {
	return &authService{
		cfg:       cfg,
		userRepo:  userRepo,
		tokenRepo: tokenRepo,
	}
}

func (s *authService) Login(ctx context.Context, identifier, password string) (*domain.TokenPair, error) {
	if identifier == "" || password == "" {
		return nil, ErrInvalidCredentials
	}

	user, passwordHash, err := s.userRepo.GetByPhoneOrEmail(ctx, identifier)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !user.IsActive {
		return nil, ErrUserInactive
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.generateTokenPair(ctx, user)
}

func (s *authService) Refresh(ctx context.Context, rawRefreshToken string) (*domain.TokenPair, error) {
	if rawRefreshToken == "" {
		return nil, ErrInvalidToken
	}

	tokenHash := hashToken(rawRefreshToken)
	userID, expiresAt, err := s.tokenRepo.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, ErrInvalidToken
	}

	if time.Now().After(expiresAt) {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, ErrInvalidToken
	}

	if !user.IsActive {
		return nil, ErrUserInactive
	}

	// Rotate refresh token
	_ = s.tokenRepo.RevokeRefreshToken(ctx, tokenHash)

	return s.generateTokenPair(ctx, user)
}

func (s *authService) Logout(ctx context.Context, rawRefreshToken string) error {
	if rawRefreshToken == "" {
		return nil
	}
	tokenHash := hashToken(rawRefreshToken)
	return s.tokenRepo.RevokeRefreshToken(ctx, tokenHash)
}

func (s *authService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*JWTClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

func (s *authService) SeedOwnerIfEmpty(ctx context.Context, phone string, email *string, password string, fullName string) error {
	count, err := s.userRepo.CountOwners(ctx)
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	owner := &domain.User{
		Phone:    phone,
		Email:    email,
		FullName: fullName,
		Role:     domain.RoleOwner,
		IsActive: true,
	}

	_, err = s.userRepo.Create(ctx, owner, string(hash))
	return err
}

func (s *authService) generateTokenPair(ctx context.Context, user *domain.User) (*domain.TokenPair, error) {
	now := time.Now()
	accessExpiresAt := now.Add(s.cfg.JWTAccessTTL)

	claims := JWTClaims{
		UserID: user.ID,
		Phone:  user.Phone,
		Email:  user.Email,
		Role:   user.Role,
		SiteID: user.SiteID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(accessExpiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	accessTokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	rawRefreshToken, err := generateRandomToken(32)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	refreshHash := hashToken(rawRefreshToken)
	refreshExpiresAt := now.Add(s.cfg.JWTRefreshTTL)

	if err := s.tokenRepo.CreateRefreshToken(ctx, user.ID, refreshHash, refreshExpiresAt); err != nil {
		return nil, fmt.Errorf("failed to save refresh token: %w", err)
	}

	return &domain.TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: rawRefreshToken,
		ExpiresAt:    accessExpiresAt,
		User:         *user,
	}, nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func generateRandomToken(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
