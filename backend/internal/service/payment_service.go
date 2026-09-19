package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
)

type PaymentService interface {
	RecordPayment(ctx context.Context, siteID string, req domain.RecordPaymentRequest, recordedByUserID string) (*domain.Payment, error)
	ListPayments(ctx context.Context, siteID string, filter domain.PaymentFilter) ([]domain.PaymentDetail, error)
	ListPaymentsByDebt(ctx context.Context, debtID, siteID string) ([]domain.PaymentDetail, error)
	GetByID(ctx context.Context, id, siteID string) (*domain.PaymentDetail, error)
	DeletePayment(ctx context.Context, id, siteID string) error
	GetStats(ctx context.Context, siteID string) (*domain.PaymentStats, error)
}

type paymentService struct {
	paymentRepo repository.PaymentRepository
	debtRepo    repository.DebtRepository
}

func NewPaymentService(paymentRepo repository.PaymentRepository, debtRepo repository.DebtRepository) PaymentService {
	return &paymentService{
		paymentRepo: paymentRepo,
		debtRepo:    debtRepo,
	}
}

func (s *paymentService) RecordPayment(ctx context.Context, siteID string, req domain.RecordPaymentRequest, recordedByUserID string) (*domain.Payment, error) {
	if req.Amount <= 0 {
		return nil, domain.ErrInvalidPaymentAmount
	}

	if req.PaymentMethod != domain.PaymentMethodCash && req.PaymentMethod != domain.PaymentMethodTransfer {
		return nil, domain.ErrInvalidPaymentMethod
	}

	paymentDate := time.Now().Format("2006-01-02")
	if req.PaymentDate != nil && *req.PaymentDate != "" {
		parsed, err := time.Parse("2006-01-02", *req.PaymentDate)
		if err != nil {
			return nil, fmt.Errorf("geçersiz ödeme tarihi formatı (YYYY-AA-GG olmalı): %w", err)
		}
		paymentDate = parsed.Format("2006-01-02")
	}

	debt, err := s.debtRepo.GetByID(ctx, req.DebtID, siteID)
	if err != nil {
		return nil, domain.ErrDebtNotFound
	}

	if debt.Remaining <= 0 || debt.Status == domain.DebtStatusPaid {
		return nil, domain.ErrDebtAlreadyPaid
	}

	// Fazla ödeme kontrolü: tahsilat kalan borçtan fazla ise aradaki fark otomatik olarak notlara işlenir
	finalNotes := req.Notes
	if req.Amount > debt.Remaining {
		excess := req.Amount - debt.Remaining
		excessTag := fmt.Sprintf("[Fazla Ödeme: ₺%.2f]", excess)
		if req.Notes != nil && strings.TrimSpace(*req.Notes) != "" {
			combined := fmt.Sprintf("%s %s", excessTag, strings.TrimSpace(*req.Notes))
			finalNotes = &combined
		} else {
			finalNotes = &excessTag
		}
	}

	p := &domain.Payment{
		DebtID:        debt.ID,
		SiteID:        siteID,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		PaymentDate:   paymentDate,
		Notes:         finalNotes,
		RecordedBy:    recordedByUserID,
	}

	created, err := s.paymentRepo.Create(ctx, p)
	if err != nil {
		return nil, fmt.Errorf("ödeme kaydedilemedi: %w", err)
	}

	// Borç durumunu güncelle
	totalPaid, err := s.paymentRepo.GetTotalPaidForDebt(ctx, debt.ID)
	if err != nil {
		slog.Error("failed to get total paid for debt", "debt_id", debt.ID, "error", err)
		totalPaid = debt.PaidAmount + req.Amount
	}

	var newStatus domain.DebtStatus
	if totalPaid >= debt.Amount {
		newStatus = domain.DebtStatusPaid
	} else if totalPaid > 0 {
		newStatus = domain.DebtStatusPartial
	} else {
		newStatus = domain.DebtStatusOpen
	}

	if err := s.debtRepo.UpdateStatus(ctx, debt.ID, newStatus); err != nil {
		slog.Error("failed to update debt status after payment", "debt_id", debt.ID, "status", newStatus, "error", err)
	}

	// TODO: Bildirim hook noktası — ödeme onayı sakin e-postası/SMS
	// if s.notificationService != nil {
	//     _ = s.notificationService.SendPaymentReceipt(ctx, debt, created)
	// }

	return created, nil
}

func (s *paymentService) ListPayments(ctx context.Context, siteID string, filter domain.PaymentFilter) ([]domain.PaymentDetail, error) {
	return s.paymentRepo.ListBySite(ctx, siteID, filter)
}

func (s *paymentService) ListPaymentsByDebt(ctx context.Context, debtID, siteID string) ([]domain.PaymentDetail, error) {
	return s.paymentRepo.ListByDebt(ctx, debtID, siteID)
}

func (s *paymentService) GetByID(ctx context.Context, id, siteID string) (*domain.PaymentDetail, error) {
	return s.paymentRepo.GetByID(ctx, id, siteID)
}

func (s *paymentService) DeletePayment(ctx context.Context, id, siteID string) error {
	payment, err := s.paymentRepo.GetByID(ctx, id, siteID)
	if err != nil {
		return domain.ErrPaymentNotFound
	}

	if err := s.paymentRepo.Delete(ctx, id, siteID); err != nil {
		return fmt.Errorf("ödeme silinemedi: %w", err)
	}

	// Silme sonrası borç durumunu yeniden hesapla
	debt, err := s.debtRepo.GetByID(ctx, payment.DebtID, siteID)
	if err == nil {
		totalPaid, err := s.paymentRepo.GetTotalPaidForDebt(ctx, payment.DebtID)
		if err == nil {
			var newStatus domain.DebtStatus
			if totalPaid >= debt.Amount {
				newStatus = domain.DebtStatusPaid
			} else if totalPaid > 0 {
				newStatus = domain.DebtStatusPartial
			} else {
				newStatus = domain.DebtStatusOpen
			}
			_ = s.debtRepo.UpdateStatus(ctx, payment.DebtID, newStatus)
		}
	}

	return nil
}

func (s *paymentService) GetStats(ctx context.Context, siteID string) (*domain.PaymentStats, error) {
	return s.paymentRepo.GetStats(ctx, siteID)
}
