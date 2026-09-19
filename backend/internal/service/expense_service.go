package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
)

var (
	ErrInvalidCategoryName        = errors.New("kategori adı zorunludur")
	ErrCategoryHasExpenses         = errors.New("bu kategoriye bağlı masraf kayıtları bulunduğu için silinemez, pasife alındı")
	ErrInvalidExpenseAmount        = errors.New("masraf tutarı sıfırdan büyük olmalıdır")
	ErrInvalidExpenseDate          = errors.New("geçerli bir harcama tarihi girilmelidir (YYYY-AA-GG)")
	ErrCategoryInactiveOrNotFound = errors.New("seçilen masraf kategorisi bulunamadı veya pasif durumda")
)

type ExpenseService interface {
	// Category
	CreateCategory(ctx context.Context, siteID string, req domain.CreateCategoryRequest) (*domain.ExpenseCategory, error)
	ListCategories(ctx context.Context, siteID string, activeOnly bool) ([]domain.ExpenseCategory, error)
	UpdateCategory(ctx context.Context, id string, siteID string, req domain.UpdateCategoryRequest) (*domain.ExpenseCategory, error)
	DeleteCategory(ctx context.Context, id string, siteID string) error

	// Expense
	CreateExpense(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error)
	ListExpenses(ctx context.Context, siteID string, filter domain.ExpenseFilter) ([]domain.Expense, *domain.ExpenseStats, error)
	GetExpenseByID(ctx context.Context, id string, siteID string) (*domain.Expense, error)
	DeleteExpense(ctx context.Context, id string, siteID string) error

	// Treasury
	GetTreasurySummary(ctx context.Context, siteID string) (*domain.TreasurySummary, error)
	UpdateSiteInitialBalance(ctx context.Context, siteID string, initialBalance float64) (float64, error)
}

type expenseService struct {
	expenseRepo repository.ExpenseRepository
}

func NewExpenseService(expenseRepo repository.ExpenseRepository) ExpenseService {
	return &expenseService{
		expenseRepo: expenseRepo,
	}
}

// Category methods

func (s *expenseService) CreateCategory(ctx context.Context, siteID string, req domain.CreateCategoryRequest) (*domain.ExpenseCategory, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, ErrInvalidCategoryName
	}

	return s.expenseRepo.CreateCategory(ctx, siteID, name)
}

func (s *expenseService) ListCategories(ctx context.Context, siteID string, activeOnly bool) ([]domain.ExpenseCategory, error) {
	return s.expenseRepo.ListCategories(ctx, siteID, activeOnly)
}

func (s *expenseService) UpdateCategory(ctx context.Context, id string, siteID string, req domain.UpdateCategoryRequest) (*domain.ExpenseCategory, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, ErrInvalidCategoryName
	}

	existing, err := s.expenseRepo.GetCategoryByID(ctx, id, siteID)
	if err != nil {
		return nil, err
	}

	isActive := existing.IsActive
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	return s.expenseRepo.UpdateCategory(ctx, id, siteID, name, isActive)
}

func (s *expenseService) DeleteCategory(ctx context.Context, id string, siteID string) error {
	existing, err := s.expenseRepo.GetCategoryByID(ctx, id, siteID)
	if err != nil {
		return err
	}

	count, err := s.expenseRepo.CountExpensesByCategory(ctx, id, siteID)
	if err != nil {
		return err
	}

	if count > 0 {
		// Bağlı masraflar var: veritabanı bütünlüğü için fiziksel silmek yerine pasife al
		_, err := s.expenseRepo.UpdateCategory(ctx, id, siteID, existing.Name, false)
		if err != nil {
			return err
		}
		return ErrCategoryHasExpenses
	}

	return s.expenseRepo.DeleteCategory(ctx, id, siteID)
}

// Expense methods

func (s *expenseService) CreateExpense(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error) {
	if req.Amount <= 0 {
		return nil, ErrInvalidExpenseAmount
	}

	req.ExpenseDate = strings.TrimSpace(req.ExpenseDate)
	if req.ExpenseDate == "" {
		req.ExpenseDate = time.Now().Format("2006-01-02")
	} else {
		if _, err := time.Parse("2006-01-02", req.ExpenseDate); err != nil {
			return nil, ErrInvalidExpenseDate
		}
	}

	cat, err := s.expenseRepo.GetCategoryByID(ctx, req.CategoryID, siteID)
	if err != nil || !cat.IsActive {
		return nil, ErrCategoryInactiveOrNotFound
	}

	if req.Description != nil {
		trimmed := strings.TrimSpace(*req.Description)
		if trimmed == "" {
			req.Description = nil
		} else {
			req.Description = &trimmed
		}
	}

	if req.ReceiptNote != nil {
		trimmed := strings.TrimSpace(*req.ReceiptNote)
		if trimmed == "" {
			req.ReceiptNote = nil
		} else {
			req.ReceiptNote = &trimmed
		}
	}

	// TODO: Rapor hook noktası — PDF ekstre ileride buradan üretilebilir

	return s.expenseRepo.CreateExpense(ctx, siteID, req, recordedBy)
}

func (s *expenseService) ListExpenses(ctx context.Context, siteID string, filter domain.ExpenseFilter) ([]domain.Expense, *domain.ExpenseStats, error) {
	expenses, err := s.expenseRepo.ListExpenses(ctx, siteID, filter)
	if err != nil {
		return nil, nil, err
	}

	stats, err := s.expenseRepo.GetExpenseStats(ctx, siteID)
	if err != nil {
		return nil, nil, err
	}

	return expenses, stats, nil
}

func (s *expenseService) GetExpenseByID(ctx context.Context, id string, siteID string) (*domain.Expense, error) {
	return s.expenseRepo.GetExpenseByID(ctx, id, siteID)
}

func (s *expenseService) DeleteExpense(ctx context.Context, id string, siteID string) error {
	return s.expenseRepo.DeleteExpense(ctx, id, siteID)
}

func (s *expenseService) GetTreasurySummary(ctx context.Context, siteID string) (*domain.TreasurySummary, error) {
	return s.expenseRepo.GetTreasurySummary(ctx, siteID)
}

func (s *expenseService) UpdateSiteInitialBalance(ctx context.Context, siteID string, initialBalance float64) (float64, error) {
	return s.expenseRepo.UpdateSiteInitialBalance(ctx, siteID, initialBalance)
}

