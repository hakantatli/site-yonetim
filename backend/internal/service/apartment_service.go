package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrLimitExceeded        = errors.New("daire limiti aşıldı: yeni daire eklemek için sistem sahibi (Owner) tarafından limit artırılmalıdır")
	ErrDoorNumberRequired   = errors.New("kapı numarası zorunludur")
	ErrPhoneRequired        = errors.New("telefon numarası zorunludur")
	ErrPasswordRequired     = errors.New("şifre zorunludur: yeni sakin için bir giriş şifresi belirlenmelidir")
	ErrOwnerRequiredForDebt = errors.New("borçları devretmek için daireye kayıtlı bir ev sahibi bulunmalıdır")
	ErrNoTenantToRemove     = errors.New("bu dairede kayıtlı aktif bir kiracı bulunmamaktadır")
	ErrInvalidDebtAction    = errors.New("geçersiz borç aksiyonu: 'keep', 'transfer' veya 'delete' seçilmelidir")
)

type ApartmentService interface {
	// Blocks
	CreateBlock(ctx context.Context, siteID string, name string) (*domain.Block, error)
	ListBlocks(ctx context.Context, siteID string) ([]domain.Block, error)
	DeleteBlock(ctx context.Context, siteID string, blockID string) error

	// Apartments
	ListApartments(ctx context.Context, siteID string) ([]domain.Apartment, error)
	GetApartmentByID(ctx context.Context, siteID string, apartmentID string) (*domain.Apartment, error)
	CreateApartment(ctx context.Context, siteID string, req domain.CreateApartmentRequest, recordedBy *string) (*domain.Apartment, error)
	UpdateApartment(ctx context.Context, siteID string, apartmentID string, req domain.UpdateApartmentRequest) (*domain.Apartment, error)
	SoftDeleteApartment(ctx context.Context, siteID string, apartmentID string) error

	// Residents
	SetOwner(ctx context.Context, siteID string, apartmentID string, resident domain.ResidentInput) (*domain.Apartment, error)
	SetTenant(ctx context.Context, siteID string, apartmentID string, resident domain.ResidentInput, recordedBy *string) (*domain.Apartment, error)
	RemoveTenant(ctx context.Context, siteID string, apartmentID string, req domain.RemoveTenantRequest) (*domain.Apartment, error)
	ListTenantHistory(ctx context.Context, apartmentID string) ([]domain.TenantHistoryItem, error)
}

type apartmentService struct {
	apartmentRepo repository.ApartmentRepository
	siteRepo      repository.SiteRepository
	userRepo      repository.UserRepository
}

func NewApartmentService(
	apartmentRepo repository.ApartmentRepository,
	siteRepo repository.SiteRepository,
	userRepo repository.UserRepository,
) ApartmentService {
	return &apartmentService{
		apartmentRepo: apartmentRepo,
		siteRepo:      siteRepo,
		userRepo:      userRepo,
	}
}

// Blocks
func (s *apartmentService) CreateBlock(ctx context.Context, siteID string, name string) (*domain.Block, error) {
	if name == "" {
		return nil, errors.New("blok adı zorunludur")
	}
	return s.apartmentRepo.CreateBlock(ctx, siteID, name)
}

func (s *apartmentService) ListBlocks(ctx context.Context, siteID string) ([]domain.Block, error) {
	return s.apartmentRepo.ListBlocks(ctx, siteID)
}

func (s *apartmentService) DeleteBlock(ctx context.Context, siteID string, blockID string) error {
	return s.apartmentRepo.DeleteBlock(ctx, blockID, siteID)
}

// Apartments
func (s *apartmentService) ListApartments(ctx context.Context, siteID string) ([]domain.Apartment, error) {
	return s.apartmentRepo.ListApartments(ctx, siteID)
}

func (s *apartmentService) GetApartmentByID(ctx context.Context, siteID string, apartmentID string) (*domain.Apartment, error) {
	return s.apartmentRepo.GetApartmentByID(ctx, apartmentID, siteID)
}

func (s *apartmentService) CreateApartment(ctx context.Context, siteID string, req domain.CreateApartmentRequest, recordedBy *string) (*domain.Apartment, error) {
	if req.DoorNumber == "" {
		return nil, ErrDoorNumberRequired
	}

	// 1. Freemium check
	site, err := s.siteRepo.GetByID(ctx, siteID)
	if err != nil {
		return nil, err
	}

	activeCount, err := s.apartmentRepo.CountActiveApartments(ctx, siteID)
	if err != nil {
		return nil, err
	}

	if activeCount >= int64(site.ApartmentLimit) {
		return nil, ErrLimitExceeded
	}

	// 2. Handle Owner creation if supplied
	var ownerUserID *string
	if req.Owner != nil && req.Owner.Phone != "" {
		uid, err := s.findOrCreateResident(ctx, siteID, *req.Owner)
		if err != nil {
			return nil, err
		}
		ownerUserID = &uid
	}

	// 3. Handle Tenant creation if supplied
	var tenantUserID *string
	if req.Tenant != nil && req.Tenant.Phone != "" {
		uid, err := s.findOrCreateResident(ctx, siteID, *req.Tenant)
		if err != nil {
			return nil, err
		}
		tenantUserID = &uid
	}

	apt, err := s.apartmentRepo.CreateApartment(ctx, siteID, req.BlockID, req.DoorNumber, req.Floor, ownerUserID, tenantUserID)
	if err != nil {
		return nil, err
	}

	// Record tenant history if tenant supplied
	if tenantUserID != nil {
		_ = s.apartmentRepo.CreateTenantHistory(ctx, apt.ID, *tenantUserID, time.Now(), recordedBy)
	}

	return apt, nil
}

func (s *apartmentService) UpdateApartment(ctx context.Context, siteID string, apartmentID string, req domain.UpdateApartmentRequest) (*domain.Apartment, error) {
	if req.DoorNumber == "" {
		return nil, ErrDoorNumberRequired
	}
	return s.apartmentRepo.UpdateApartment(ctx, apartmentID, siteID, req.BlockID, req.DoorNumber, req.Floor)
}

func (s *apartmentService) SoftDeleteApartment(ctx context.Context, siteID string, apartmentID string) error {
	return s.apartmentRepo.SoftDeleteApartment(ctx, apartmentID, siteID)
}

// Residents
func (s *apartmentService) SetOwner(ctx context.Context, siteID string, apartmentID string, resident domain.ResidentInput) (*domain.Apartment, error) {
	resident.Phone = domain.CleanPhone(resident.Phone)
	if resident.Phone == "" {
		return nil, ErrPhoneRequired
	}

	uid, err := s.findOrCreateResident(ctx, siteID, resident)
	if err != nil {
		return nil, err
	}

	if err := s.apartmentRepo.SetApartmentOwner(ctx, apartmentID, siteID, uid); err != nil {
		return nil, err
	}

	return s.apartmentRepo.GetApartmentByID(ctx, apartmentID, siteID)
}

func (s *apartmentService) SetTenant(ctx context.Context, siteID string, apartmentID string, resident domain.ResidentInput, recordedBy *string) (*domain.Apartment, error) {
	resident.Phone = domain.CleanPhone(resident.Phone)
	if resident.Phone == "" {
		return nil, ErrPhoneRequired
	}

	// Check existing apartment
	apt, err := s.apartmentRepo.GetApartmentByID(ctx, apartmentID, siteID)
	if err != nil {
		return nil, err
	}

	// If there's an existing tenant, end their history first
	if apt.TenantUserID != nil {
		_ = s.apartmentRepo.EndTenantHistory(ctx, apartmentID, *apt.TenantUserID, time.Now(), "keep", nil)
	}

	uid, err := s.findOrCreateResident(ctx, siteID, resident)
	if err != nil {
		return nil, err
	}

	if err := s.apartmentRepo.SetApartmentTenant(ctx, apartmentID, siteID, uid); err != nil {
		return nil, err
	}

	// Create tenant history record
	_ = s.apartmentRepo.CreateTenantHistory(ctx, apartmentID, uid, time.Now(), recordedBy)

	return s.apartmentRepo.GetApartmentByID(ctx, apartmentID, siteID)
}

func (s *apartmentService) RemoveTenant(ctx context.Context, siteID string, apartmentID string, req domain.RemoveTenantRequest) (*domain.Apartment, error) {
	if req.DebtAction != "keep" && req.DebtAction != "transfer" && req.DebtAction != "delete" {
		return nil, ErrInvalidDebtAction
	}

	apt, err := s.apartmentRepo.GetApartmentByID(ctx, apartmentID, siteID)
	if err != nil {
		return nil, err
	}

	if apt.TenantUserID == nil {
		return nil, ErrNoTenantToRemove
	}

	oldTenantID := *apt.TenantUserID

	// Handle debt action
	switch req.DebtAction {
	case "transfer":
		if apt.OwnerUserID == nil {
			return nil, ErrOwnerRequiredForDebt
		}
		if err := s.apartmentRepo.TransferOpenDebtsToOwner(ctx, apartmentID, oldTenantID, *apt.OwnerUserID); err != nil {
			return nil, fmt.Errorf("borçlar devredilemedi: %w", err)
		}
	case "delete":
		if err := s.apartmentRepo.DeleteOpenDebtsByDebtor(ctx, apartmentID, oldTenantID); err != nil {
			return nil, fmt.Errorf("borçlar silinemedi: %w", err)
		}
	case "keep":
		// Left on old tenant's account
	}

	// End tenant history
	if err := s.apartmentRepo.EndTenantHistory(ctx, apartmentID, oldTenantID, time.Now(), req.DebtAction, req.Notes); err != nil {
		return nil, err
	}

	// Clear tenant from apartment
	if err := s.apartmentRepo.RemoveApartmentTenant(ctx, apartmentID, siteID); err != nil {
		return nil, err
	}

	return s.apartmentRepo.GetApartmentByID(ctx, apartmentID, siteID)
}

func (s *apartmentService) ListTenantHistory(ctx context.Context, apartmentID string) ([]domain.TenantHistoryItem, error) {
	return s.apartmentRepo.ListTenantHistory(ctx, apartmentID)
}

// Helper to find or create resident
func (s *apartmentService) findOrCreateResident(ctx context.Context, siteID string, res domain.ResidentInput) (string, error) {
	res.Phone = domain.CleanPhone(res.Phone)
	if res.Phone == "" {
		return "", ErrPhoneRequired
	}

	existing, _, _ := s.userRepo.GetByPhone(ctx, res.Phone)
	if existing != nil {
		return existing.ID, nil
	}

	password := strings.TrimSpace(res.Password)
	if password == "" {
		return "", ErrPasswordRequired
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	newUser := &domain.User{
		SiteID:   &siteID,
		Phone:    res.Phone,
		Email:    res.Email,
		FullName: res.FullName,
		Role:     domain.RoleResident,
		IsActive: true,
	}

	created, err := s.userRepo.Create(ctx, newUser, string(hash))
	if err != nil {
		return "", err
	}

	return created.ID, nil
}
