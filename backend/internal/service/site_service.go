package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidSiteInput  = errors.New("site adı zorunludur")
	ErrInvalidLimit      = errors.New("daire limiti 1 veya daha büyük olmalıdır")
	ErrAdminPhoneExists  = errors.New("bu telefon numarası zaten kullanımda")
	ErrAdminEmailExists  = errors.New("bu e-posta adresi zaten kullanımda")
	ErrInvalidAdminInput = errors.New("telefon numarası, şifre ve ad soyad zorunludur")
)

type SiteService interface {
	CreateSite(ctx context.Context, req domain.CreateSiteRequest) (*domain.Site, error)
	ListSites(ctx context.Context) ([]domain.Site, error)
	GetSiteDetails(ctx context.Context, id string) (*domain.SiteDetail, error)
	UpdateLimit(ctx context.Context, id string, limit int32) (*domain.Site, error)
	CreateAdmin(ctx context.Context, siteID string, req domain.CreateAdminRequest) (*domain.User, error)
}

type siteService struct {
	siteRepo repository.SiteRepository
	userRepo repository.UserRepository
}

func NewSiteService(siteRepo repository.SiteRepository, userRepo repository.UserRepository) SiteService {
	return &siteService{
		siteRepo: siteRepo,
		userRepo: userRepo,
	}
}

func (s *siteService) CreateSite(ctx context.Context, req domain.CreateSiteRequest) (*domain.Site, error) {
	if req.Name == "" {
		return nil, ErrInvalidSiteInput
	}

	limit := int32(10)
	if req.ApartmentLimit != nil {
		if *req.ApartmentLimit < 1 {
			return nil, ErrInvalidLimit
		}
		limit = *req.ApartmentLimit
	}

	site, err := s.siteRepo.Create(ctx, req.Name, req.Address, limit)
	if err != nil {
		return nil, fmt.Errorf("site oluşturulamadı: %w", err)
	}

	// Seed default expense categories
	if err := s.siteRepo.CreateDefaultCategories(ctx, site.ID); err != nil {
		// Log but don't fail site creation if categories already exist
	}

	return site, nil
}

func (s *siteService) ListSites(ctx context.Context) ([]domain.Site, error) {
	return s.siteRepo.List(ctx)
}

func (s *siteService) GetSiteDetails(ctx context.Context, id string) (*domain.SiteDetail, error) {
	detail, err := s.siteRepo.GetDetails(ctx, id)
	if err != nil {
		return nil, err
	}

	admins, err := s.userRepo.ListAdminsBySiteID(ctx, id)
	if err != nil {
		return nil, err
	}
	detail.Admins = admins

	return detail, nil
}

func (s *siteService) UpdateLimit(ctx context.Context, id string, limit int32) (*domain.Site, error) {
	if limit < 1 {
		return nil, ErrInvalidLimit
	}
	return s.siteRepo.UpdateLimit(ctx, id, limit)
}

func (s *siteService) CreateAdmin(ctx context.Context, siteID string, req domain.CreateAdminRequest) (*domain.User, error) {
	req.Phone = domain.CleanPhone(req.Phone)
	req.FullName = strings.TrimSpace(req.FullName)
	if req.Phone == "" || req.Password == "" || req.FullName == "" {
		return nil, ErrInvalidAdminInput
	}

	// Verify site exists
	_, err := s.siteRepo.GetByID(ctx, siteID)
	if err != nil {
		return nil, err
	}

	// Check if phone already used
	existing, _, _ := s.userRepo.GetByPhone(ctx, req.Phone)
	if existing != nil {
		return nil, ErrAdminPhoneExists
	}

	// Check if email already used (if provided)
	if req.Email != nil && strings.TrimSpace(*req.Email) != "" {
		trimmedEmail := strings.TrimSpace(*req.Email)
		req.Email = &trimmedEmail
		existingEmail, _, _ := s.userRepo.GetByEmail(ctx, trimmedEmail)
		if existingEmail != nil {
			return nil, ErrAdminEmailExists
		}
	} else {
		req.Email = nil
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		SiteID:   &siteID,
		Phone:    req.Phone,
		Email:    req.Email,
		FullName: req.FullName,
		Role:     domain.RoleAdmin,
		IsActive: true,
	}

	created, err := s.userRepo.Create(ctx, user, string(passwordHash))
	if err != nil {
		return nil, err
	}

	return created, nil
}
