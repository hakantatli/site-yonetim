package repository

import (
	"context"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentRepository interface {
	Create(ctx context.Context, p *domain.Payment) (*domain.Payment, error)
	ListBySite(ctx context.Context, siteID string, filter domain.PaymentFilter) ([]domain.PaymentDetail, error)
	ListByDebt(ctx context.Context, debtID, siteID string) ([]domain.PaymentDetail, error)
	GetByID(ctx context.Context, id, siteID string) (*domain.PaymentDetail, error)
	Delete(ctx context.Context, id, siteID string) error
	GetTotalPaidForDebt(ctx context.Context, debtID string) (float64, error)
	GetStats(ctx context.Context, siteID string) (*domain.PaymentStats, error)
}

type pgPaymentRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPaymentRepository(pool *pgxpool.Pool) PaymentRepository {
	return &pgPaymentRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *pgPaymentRepository) Create(ctx context.Context, p *domain.Payment) (*domain.Payment, error) {
	created, err := r.queries.CreatePayment(ctx, db.CreatePaymentParams{
		DebtID:        StringToUUID(p.DebtID),
		SiteID:        StringToUUID(p.SiteID),
		Amount:        Float64ToNumeric(p.Amount),
		PaymentMethod: StringToText(string(p.PaymentMethod)),
		PaymentDate:   StringToDate(p.PaymentDate),
		Notes:         PtrStringToText(p.Notes),
		RecordedBy:    StringToUUID(p.RecordedBy),
	})
	if err != nil {
		return nil, err
	}

	return &domain.Payment{
		ID:            UUIDToString(created.ID),
		DebtID:        UUIDToString(created.DebtID),
		SiteID:        UUIDToString(created.SiteID),
		Amount:        NumericToFloat64(created.Amount),
		PaymentMethod: domain.PaymentMethod(TextToString(created.PaymentMethod)),
		PaymentDate:   DateToString(created.PaymentDate),
		Notes:         TextToPtrString(created.Notes),
		RecordedBy:    UUIDToString(created.RecordedBy),
		CreatedAt:     created.CreatedAt.Time,
	}, nil
}

func (r *pgPaymentRepository) ListBySite(ctx context.Context, siteID string, filter domain.PaymentFilter) ([]domain.PaymentDetail, error) {
	params := db.ListPaymentsBySiteParams{
		SiteID:        StringToUUID(siteID),
		DebtID:        PtrStringToUUID(filter.DebtID),
		ApartmentID:   PtrStringToUUID(filter.ApartmentID),
		PaymentMethod: PtrStringToText(filter.PaymentMethod),
		StartDate:     PtrStringToDate(filter.StartDate),
		EndDate:       PtrStringToDate(filter.EndDate),
		DebtorUserID:  PtrStringToUUID(filter.DebtorUserID),
	}

	rows, err := r.queries.ListPaymentsBySite(ctx, params)
	if err != nil {
		return nil, err
	}

	result := make([]domain.PaymentDetail, len(rows))
	for i, row := range rows {
		result[i] = domain.PaymentDetail{
			ID:              UUIDToString(row.ID),
			DebtID:          UUIDToString(row.DebtID),
			SiteID:          UUIDToString(row.SiteID),
			Amount:          NumericToFloat64(row.Amount),
			PaymentMethod:   domain.PaymentMethod(TextToString(row.PaymentMethod)),
			PaymentDate:     DateToString(row.PaymentDate),
			Notes:           TextToPtrString(row.Notes),
			RecordedBy:      UUIDToString(row.RecordedBy),
			CreatedAt:       row.CreatedAt.Time,
			RecordedByName:  row.RecordedByName,
			DebtType:        domain.DebtType(row.DebtType),
			DebtDueMonth:    DateToPtrString(row.DebtDueMonth),
			DebtDescription: TextToPtrString(row.DebtDescription),
			DebtTotalAmount: NumericToFloat64(row.DebtTotalAmount),
			DoorNumber:      row.DoorNumber,
			BlockName:       row.BlockName,
			DebtorFullName:  row.DebtorFullName,
			DebtorPhone:     row.DebtorPhone,
		}
	}
	return result, nil
}

func (r *pgPaymentRepository) ListByDebt(ctx context.Context, debtID, siteID string) ([]domain.PaymentDetail, error) {
	rows, err := r.queries.ListPaymentsByDebt(ctx, db.ListPaymentsByDebtParams{
		DebtID: StringToUUID(debtID),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		return nil, err
	}

	result := make([]domain.PaymentDetail, len(rows))
	for i, row := range rows {
		result[i] = domain.PaymentDetail{
			ID:             UUIDToString(row.ID),
			DebtID:         UUIDToString(row.DebtID),
			SiteID:         UUIDToString(row.SiteID),
			Amount:         NumericToFloat64(row.Amount),
			PaymentMethod:  domain.PaymentMethod(TextToString(row.PaymentMethod)),
			PaymentDate:    DateToString(row.PaymentDate),
			Notes:          TextToPtrString(row.Notes),
			RecordedBy:     UUIDToString(row.RecordedBy),
			CreatedAt:      row.CreatedAt.Time,
			RecordedByName: row.RecordedByName,
		}
	}
	return result, nil
}

func (r *pgPaymentRepository) GetByID(ctx context.Context, id, siteID string) (*domain.PaymentDetail, error) {
	row, err := r.queries.GetPaymentByID(ctx, db.GetPaymentByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		return nil, err
	}

	return &domain.PaymentDetail{
		ID:              UUIDToString(row.ID),
		DebtID:          UUIDToString(row.DebtID),
		SiteID:          UUIDToString(row.SiteID),
		Amount:          NumericToFloat64(row.Amount),
		PaymentMethod:   domain.PaymentMethod(TextToString(row.PaymentMethod)),
		PaymentDate:     DateToString(row.PaymentDate),
		Notes:           TextToPtrString(row.Notes),
		RecordedBy:      UUIDToString(row.RecordedBy),
		CreatedAt:       row.CreatedAt.Time,
		RecordedByName:  row.RecordedByName,
		DebtType:        domain.DebtType(row.DebtType),
		DebtDueMonth:    DateToPtrString(row.DebtDueMonth),
		DebtDescription: TextToPtrString(row.DebtDescription),
		DebtTotalAmount: NumericToFloat64(row.DebtTotalAmount),
		DoorNumber:      row.DoorNumber,
		BlockName:       row.BlockName,
		DebtorFullName:  row.DebtorFullName,
		DebtorPhone:     row.DebtorPhone,
	}, nil
}

func (r *pgPaymentRepository) Delete(ctx context.Context, id, siteID string) error {
	return r.queries.DeletePaymentByID(ctx, db.DeletePaymentByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

func (r *pgPaymentRepository) GetTotalPaidForDebt(ctx context.Context, debtID string) (float64, error) {
	total, err := r.queries.GetTotalPaidForDebt(ctx, StringToUUID(debtID))
	if err != nil {
		return 0, err
	}
	return NumericToFloat64(total), nil
}

func (r *pgPaymentRepository) GetStats(ctx context.Context, siteID string) (*domain.PaymentStats, error) {
	row, err := r.queries.GetPaymentStatsBySite(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}

	return &domain.PaymentStats{
		TotalCollected: NumericToFloat64(row.TotalCollected),
		CashTotal:      NumericToFloat64(row.CashTotal),
		TransferTotal:  NumericToFloat64(row.TransferTotal),
		TotalCount:     int(row.TotalCount),
	}, nil
}
