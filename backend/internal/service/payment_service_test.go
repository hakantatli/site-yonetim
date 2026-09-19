package service

import (
	"context"
	"strings"
	"testing"

	"github.com/hakantatli/site-yonetim/internal/domain"
)

func TestPaymentService_RecordPayment(t *testing.T) {
	ctx := context.Background()

	t.Run("partial payment updates debt status to partial", func(t *testing.T) {
		debt := &domain.DebtDetail{
			ID:           "debt-1",
			Amount:       1000,
			Status:       domain.DebtStatusOpen,
			DebtorUserID: "user-1",
			PaidAmount:   0,
			Remaining:    1000,
		}

		var updatedStatus domain.DebtStatus
		debtRepo := &mockDebtRepository{
			getByIDFn: func(ctx context.Context, id, siteID string) (*domain.DebtDetail, error) {
				return debt, nil
			},
			updateStatusFn: func(ctx context.Context, id string, status domain.DebtStatus) error {
				updatedStatus = status
				return nil
			},
		}

		paymentRepo := &mockPaymentRepository{
			createFn: func(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
				p.ID = "payment-1"
				return p, nil
			},
			getTotalPaidForDebtFn: func(ctx context.Context, debtID string) (float64, error) {
				return 400, nil // 400 < 1000 -> partial
			},
		}

		svc := NewPaymentService(paymentRepo, debtRepo)
		p, err := svc.RecordPayment(ctx, "site-1", domain.RecordPaymentRequest{
			DebtID:        "debt-1",
			Amount:        400,
			PaymentMethod: domain.PaymentMethodCash,
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if p.Amount != 400 {
			t.Fatalf("expected amount 400, got %f", p.Amount)
		}
		if updatedStatus != domain.DebtStatusPartial {
			t.Fatalf("expected debt status to be partial, got %s", updatedStatus)
		}
	})

	t.Run("full payment updates debt status to paid", func(t *testing.T) {
		debt := &domain.DebtDetail{
			ID:           "debt-2",
			Amount:       1000,
			Status:       domain.DebtStatusPartial,
			DebtorUserID: "user-1",
			PaidAmount:   400,
			Remaining:    600,
		}

		var updatedStatus domain.DebtStatus
		debtRepo := &mockDebtRepository{
			getByIDFn: func(ctx context.Context, id, siteID string) (*domain.DebtDetail, error) {
				return debt, nil
			},
			updateStatusFn: func(ctx context.Context, id string, status domain.DebtStatus) error {
				updatedStatus = status
				return nil
			},
		}

		paymentRepo := &mockPaymentRepository{
			createFn: func(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
				p.ID = "payment-2"
				return p, nil
			},
			getTotalPaidForDebtFn: func(ctx context.Context, debtID string) (float64, error) {
				return 1000, nil // total is 1000 >= 1000 -> paid
			},
		}

		svc := NewPaymentService(paymentRepo, debtRepo)
		_, err := svc.RecordPayment(ctx, "site-1", domain.RecordPaymentRequest{
			DebtID:        "debt-2",
			Amount:        600,
			PaymentMethod: domain.PaymentMethodTransfer,
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if updatedStatus != domain.DebtStatusPaid {
			t.Fatalf("expected debt status to be paid, got %s", updatedStatus)
		}
	})

	t.Run("overpayment marks status paid and appends excess tag to notes", func(t *testing.T) {
		debt := &domain.DebtDetail{
			ID:           "debt-3",
			Amount:       500,
			Status:       domain.DebtStatusOpen,
			DebtorUserID: "user-1",
			PaidAmount:   0,
			Remaining:    500,
		}

		var capturedPayment *domain.Payment
		debtRepo := &mockDebtRepository{
			getByIDFn: func(ctx context.Context, id, siteID string) (*domain.DebtDetail, error) {
				return debt, nil
			},
			updateStatusFn: func(ctx context.Context, id string, status domain.DebtStatus) error {
				return nil
			},
		}

		paymentRepo := &mockPaymentRepository{
			createFn: func(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
				capturedPayment = p
				p.ID = "payment-3"
				return p, nil
			},
			getTotalPaidForDebtFn: func(ctx context.Context, debtID string) (float64, error) {
				return 550, nil // 550 >= 500
			},
		}

		svc := NewPaymentService(paymentRepo, debtRepo)
		existingNote := "Elden teslim alındı"
		_, err := svc.RecordPayment(ctx, "site-1", domain.RecordPaymentRequest{
			DebtID:        "debt-3",
			Amount:        550, // 500 remaining, 50 excess
			PaymentMethod: domain.PaymentMethodCash,
			Notes:         &existingNote,
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if capturedPayment.Notes == nil || !strings.Contains(*capturedPayment.Notes, "[Fazla Ödeme: ₺50.00]") {
			t.Fatalf("expected excess note, got %v", capturedPayment.Notes)
		}
	})

	t.Run("payment on already paid debt returns ErrDebtAlreadyPaid", func(t *testing.T) {
		debt := &domain.DebtDetail{
			ID:         "debt-4",
			Amount:     500,
			Status:     domain.DebtStatusPaid,
			PaidAmount: 500,
			Remaining:  0,
		}

		debtRepo := &mockDebtRepository{
			getByIDFn: func(ctx context.Context, id, siteID string) (*domain.DebtDetail, error) {
				return debt, nil
			},
		}

		svc := NewPaymentService(&mockPaymentRepository{}, debtRepo)
		_, err := svc.RecordPayment(ctx, "site-1", domain.RecordPaymentRequest{
			DebtID:        "debt-4",
			Amount:        100,
			PaymentMethod: domain.PaymentMethodCash,
		}, "admin-1")

		if err != domain.ErrDebtAlreadyPaid {
			t.Fatalf("expected ErrDebtAlreadyPaid, got %v", err)
		}
	})
}
