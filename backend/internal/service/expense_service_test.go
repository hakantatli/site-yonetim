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

	t.Run("invoice file exceeding 2MB returns ErrInvoiceFileTooLarge", func(t *testing.T) {
		expenseRepo := &mockExpenseRepository{
			getCategoryByIDFn: func(ctx context.Context, id, siteID string) (*domain.ExpenseCategory, error) {
				return activeCategory, nil
			},
		}

		svc := NewExpenseService(expenseRepo)
		largeData := make([]byte, 2*1024*1024+1)
		fileName := "fatura.pdf"
		_, err := svc.CreateExpense(ctx, "site-1", domain.CreateExpenseRequest{
			CategoryID:      "cat-1",
			Amount:          100,
			ExpenseDate:     "2026-09-15",
			InvoiceFileName: &fileName,
			InvoiceFileData: largeData,
		}, "admin-1")

		if err != ErrInvoiceFileTooLarge {
			t.Fatalf("expected ErrInvoiceFileTooLarge, got %v", err)
		}
	})

	t.Run("invoice file with invalid extension/content returns ErrInvalidInvoiceFileType", func(t *testing.T) {
		expenseRepo := &mockExpenseRepository{
			getCategoryByIDFn: func(ctx context.Context, id, siteID string) (*domain.ExpenseCategory, error) {
				return activeCategory, nil
			},
		}

		svc := NewExpenseService(expenseRepo)
		textData := []byte("plain text file content not pdf or jpeg")
		fileName := "fatura.txt"
		_, err := svc.CreateExpense(ctx, "site-1", domain.CreateExpenseRequest{
			CategoryID:      "cat-1",
			Amount:          100,
			ExpenseDate:     "2026-09-15",
			InvoiceFileName: &fileName,
			InvoiceFileData: textData,
		}, "admin-1")

		if err != ErrInvalidInvoiceFileType {
			t.Fatalf("expected ErrInvalidInvoiceFileType, got %v", err)
		}
	})

	t.Run("valid pdf invoice succeeds and sets invoice metadata", func(t *testing.T) {
		pdfData := []byte("%PDF-1.4 sample pdf content")
		fileName := "fatura.pdf"

		expenseRepo := &mockExpenseRepository{
			getCategoryByIDFn: func(ctx context.Context, id, siteID string) (*domain.ExpenseCategory, error) {
				return activeCategory, nil
			},
			createExpenseFn: func(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error) {
				invID := "inv-1"
				fileSize := len(req.InvoiceFileData)
				return &domain.Expense{
					ID:              "exp-1",
					SiteID:          siteID,
					CategoryID:      req.CategoryID,
					Amount:          req.Amount,
					InvoiceID:       &invID,
					InvoiceFileName: req.InvoiceFileName,
					InvoiceFileSize: &fileSize,
					InvoiceFileType: req.InvoiceFileType,
				}, nil
			},
		}

		svc := NewExpenseService(expenseRepo)
		exp, err := svc.CreateExpense(ctx, "site-1", domain.CreateExpenseRequest{
			CategoryID:      "cat-1",
			Amount:          100,
			ExpenseDate:     "2026-09-15",
			InvoiceFileName: &fileName,
			InvoiceFileData: pdfData,
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if exp.InvoiceID == nil || *exp.InvoiceID != "inv-1" {
			t.Fatalf("expected invoice_id inv-1, got %v", exp.InvoiceID)
		}
		if exp.InvoiceFileType == nil || *exp.InvoiceFileType != "application/pdf" {
			t.Fatalf("expected file type application/pdf, got %v", exp.InvoiceFileType)
		}
	})

	t.Run("valid jpeg invoice succeeds", func(t *testing.T) {
		jpegData := []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46}
		fileName := "fatura.jpg"

		expenseRepo := &mockExpenseRepository{
			getCategoryByIDFn: func(ctx context.Context, id, siteID string) (*domain.ExpenseCategory, error) {
				return activeCategory, nil
			},
			createExpenseFn: func(ctx context.Context, siteID string, req domain.CreateExpenseRequest, recordedBy string) (*domain.Expense, error) {
				invID := "inv-2"
				fileSize := len(req.InvoiceFileData)
				return &domain.Expense{
					ID:              "exp-2",
					SiteID:          siteID,
					CategoryID:      req.CategoryID,
					Amount:          req.Amount,
					InvoiceID:       &invID,
					InvoiceFileName: req.InvoiceFileName,
					InvoiceFileSize: &fileSize,
					InvoiceFileType: req.InvoiceFileType,
				}, nil
			},
		}

		svc := NewExpenseService(expenseRepo)
		exp, err := svc.CreateExpense(ctx, "site-1", domain.CreateExpenseRequest{
			CategoryID:      "cat-1",
			Amount:          250,
			ExpenseDate:     "2026-09-15",
			InvoiceFileName: &fileName,
			InvoiceFileData: jpegData,
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if exp.InvoiceFileType == nil || *exp.InvoiceFileType != "image/jpeg" {
			t.Fatalf("expected file type image/jpeg, got %v", exp.InvoiceFileType)
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
