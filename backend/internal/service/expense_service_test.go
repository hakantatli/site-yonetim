package service

import (
	"context"
	"testing"

	"github.com/hakantatli/site-yonetim/internal/domain"
)

func TestExpenseService_CreateExpense(t *testing.T) {
	ctx := context.Background()

	activeCategory := &domain.ExpenseCategory{
		ID:       "cat-1",
		SiteID:   "site-1",
		Name:     "Elektrik",
		IsActive: true,
	}

	inactiveCategory := &domain.ExpenseCategory{
		ID:       "cat-2",
		SiteID:   "site-1",
		Name:     "Eski Kalem",
		IsActive: false,
	}

	t.Run("creating expense with valid data succeeds", func(t *testing.T) {
		expenseRepo := &mockExpenseRepository{
			getCategoryByIDFn: func(ctx context.Context, id, siteID string) (*domain.ExpenseCategory, error) {
				return activeCategory, nil
			},
			createExpenseFn: func(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error) {
				return &domain.Expense{
					ID:          "exp-1",
					SiteID:      siteID,
					CategoryID:  req.CategoryID,
					Amount:      req.Amount,
					Description: req.Description,
				}, nil
			},
		}

		svc := NewExpenseService(expenseRepo)
		desc := "Merdiven aydınlatma faturası"
		exp, err := svc.CreateExpense(ctx, "site-1", domain.CreateExpenseRequest{
			CategoryID:  "cat-1",
			Amount:      1250.50,
			ExpenseDate: "2026-09-15",
			Description: &desc,
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if exp.Amount != 1250.50 {
			t.Fatalf("expected amount 1250.50, got %f", exp.Amount)
		}
	})

	t.Run("amount <= 0 returns ErrInvalidExpenseAmount", func(t *testing.T) {
		svc := NewExpenseService(&mockExpenseRepository{})
		_, err := svc.CreateExpense(ctx, "site-1", domain.CreateExpenseRequest{
			CategoryID:  "cat-1",
			Amount:      0,
			ExpenseDate: "2026-09-15",
		}, "admin-1")

		if err != ErrInvalidExpenseAmount {
			t.Fatalf("expected ErrInvalidExpenseAmount, got %v", err)
		}
	})

	t.Run("inactive category returns ErrCategoryInactiveOrNotFound", func(t *testing.T) {
		expenseRepo := &mockExpenseRepository{
			getCategoryByIDFn: func(ctx context.Context, id, siteID string) (*domain.ExpenseCategory, error) {
				return inactiveCategory, nil
			},
		}

		svc := NewExpenseService(expenseRepo)
		_, err := svc.CreateExpense(ctx, "site-1", domain.CreateExpenseRequest{
			CategoryID:  "cat-2",
			Amount:      500,
			ExpenseDate: "2026-09-15",
		}, "admin-1")

		if err != ErrCategoryInactiveOrNotFound {
			t.Fatalf("expected ErrCategoryInactiveOrNotFound, got %v", err)
		}
	})
}

func TestExpenseService_GetTreasurySummary(t *testing.T) {
	ctx := context.Background()

	expectedSummary := &domain.TreasurySummary{
		TotalIncome:    50000,
		TotalExpense:   20000,
		NetBalance:     40000, // 10000 initial + 50000 - 20000
		InitialBalance: 10000,
	}

	expenseRepo := &mockExpenseRepository{
		getTreasurySummaryFn: func(ctx context.Context, siteID string) (*domain.TreasurySummary, error) {
			return expectedSummary, nil
		},
	}

	svc := NewExpenseService(expenseRepo)
	summary, err := svc.GetTreasurySummary(ctx, "site-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if summary.NetBalance != 40000 || summary.InitialBalance != 10000 {
		t.Fatalf("treasury summary mismatch: %+v", summary)
	}
}
