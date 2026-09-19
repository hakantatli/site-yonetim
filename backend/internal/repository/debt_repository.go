package repository

import (
	"context"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DebtRepository interface {
	Create(ctx context.Context, debt *domain.Debt) (*domain.Debt, error)
	AccrueMonthlyDue(ctx context.Context, siteID, apartmentID, debtorUserID string, amount float64, dueMonth string, description string, createdBy *string) (string, error)
	List(ctx context.Context, filter domain.DebtFilter) ([]domain.DebtDetail, error)
	GetByID(ctx context.Context, id, siteID string) (*domain.DebtDetail, error)
	GetStats(ctx context.Context, siteID string) (*domain.DebtStats, error)
	ListActiveApartmentsForAccrual(ctx context.Context, siteID string) ([]db.ListActiveApartmentsForAccrualRow, error)
	TransferOpenDebtsToOwner(ctx context.Context, apartmentID, oldTenantID, ownerID string) error
	DeleteOpenDebtsByDebtor(ctx context.Context, apartmentID, debtorID string) error
	Delete(ctx context.Context, id, siteID string) error
	UpdateStatus(ctx context.Context, id string, status domain.DebtStatus) error
}

type pgDebtRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewDebtRepository(pool *pgxpool.Pool) DebtRepository {
	return &pgDebtRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *pgDebtRepository) Create(ctx context.Context, debt *domain.Debt) (*domain.Debt, error) {
	created, err := r.queries.CreateDebt(ctx, db.CreateDebtParams{
		SiteID:       StringToUUID(debt.SiteID),
		ApartmentID:  StringToUUID(debt.ApartmentID),
		DebtorUserID: StringToUUID(debt.DebtorUserID),
		Type:         string(debt.Type),
		Amount:       Float64ToNumeric(debt.Amount),
		DueMonth:     PtrStringToDate(debt.DueMonth),
		Description:  PtrStringToText(debt.Description),
		Status:       string(debt.Status),
		CreatedBy:    PtrStringToUUID(debt.CreatedBy),
	})
	if err != nil {
		return nil, err
	}

	return &domain.Debt{
		ID:           UUIDToString(created.ID),
		SiteID:       UUIDToString(created.SiteID),
		ApartmentID:  UUIDToString(created.ApartmentID),
		DebtorUserID: UUIDToString(created.DebtorUserID),
		Type:         domain.DebtType(created.Type),
		Amount:       NumericToFloat64(created.Amount),
		DueMonth:     DateToPtrString(created.DueMonth),
		Description:  TextToPtrString(created.Description),
		Status:       domain.DebtStatus(created.Status),
		CreatedBy:    UUIDToPtrString(created.CreatedBy),
		CreatedAt:    created.CreatedAt.Time,
		UpdatedAt:    created.UpdatedAt.Time,
	}, nil
}

func (r *pgDebtRepository) AccrueMonthlyDue(ctx context.Context, siteID, apartmentID, debtorUserID string, amount float64, dueMonth string, description string, createdBy *string) (string, error) {
	id, err := r.queries.AccrueMonthlyDue(ctx, db.AccrueMonthlyDueParams{
		SiteID:       StringToUUID(siteID),
		ApartmentID:  StringToUUID(apartmentID),
		DebtorUserID: StringToUUID(debtorUserID),
		Amount:       Float64ToNumeric(amount),
		DueMonth:     StringToDate(dueMonth),
		Description:  PtrStringToText(&description),
		CreatedBy:    PtrStringToUUID(createdBy),
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			// ON CONFLICT DO NOTHING returned no row
			return "", nil
		}
		return "", err
	}
	return UUIDToString(id), nil
}

func (r *pgDebtRepository) List(ctx context.Context, filter domain.DebtFilter) ([]domain.DebtDetail, error) {
	rows, err := r.queries.ListDebtsBySite(ctx, db.ListDebtsBySiteParams{
		SiteID:       StringToUUID(filter.SiteID),
		Status:       PtrStringToText(filter.Status),
		Type:         PtrStringToText(filter.Type),
		ApartmentID:  PtrStringToUUID(filter.ApartmentID),
		DebtorUserID: PtrStringToUUID(filter.DebtorUserID),
	})
	if err != nil {
		return nil, err
	}

	results := make([]domain.DebtDetail, len(rows))
	for i, row := range rows {
		results[i] = domain.DebtDetail{
			ID:             UUIDToString(row.ID),
			SiteID:         UUIDToString(row.SiteID),
			ApartmentID:    UUIDToString(row.ApartmentID),
			DebtorUserID:   UUIDToString(row.DebtorUserID),
			Type:           domain.DebtType(row.Type),
			Amount:         NumericToFloat64(row.Amount),
			DueMonth:       DateToPtrString(row.DueMonth),
			Description:    TextToPtrString(row.Description),
			Status:         domain.DebtStatus(row.Status),
			CreatedAt:      row.CreatedAt.Time,
			PaidAmount:     NumericToFloat64(row.PaidAmount),
			Remaining:      NumericToFloat64(row.Remaining),
			DoorNumber:     row.DoorNumber,
			BlockName:      row.BlockName,
			DebtorFullName: row.DebtorFullName,
			DebtorPhone:    row.DebtorPhone,
		}
	}
	return results, nil
}

func (r *pgDebtRepository) GetByID(ctx context.Context, id, siteID string) (*domain.DebtDetail, error) {
	row, err := r.queries.GetDebtDetailByID(ctx, db.GetDebtDetailByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &domain.DebtDetail{
		ID:             UUIDToString(row.ID),
		SiteID:         UUIDToString(row.SiteID),
		ApartmentID:    UUIDToString(row.ApartmentID),
		DebtorUserID:   UUIDToString(row.DebtorUserID),
		Type:           domain.DebtType(row.Type),
		Amount:         NumericToFloat64(row.Amount),
		DueMonth:       DateToPtrString(row.DueMonth),
		Description:    TextToPtrString(row.Description),
		Status:         domain.DebtStatus(row.Status),
		CreatedAt:      row.CreatedAt.Time,
		PaidAmount:     NumericToFloat64(row.PaidAmount),
		Remaining:      NumericToFloat64(row.Remaining),
		DoorNumber:     row.DoorNumber,
		BlockName:      row.BlockName,
		DebtorFullName: row.DebtorFullName,
		DebtorPhone:    row.DebtorPhone,
	}, nil
}

func (r *pgDebtRepository) GetStats(ctx context.Context, siteID string) (*domain.DebtStats, error) {
	row, err := r.queries.GetDebtsStatsBySite(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}

	return &domain.DebtStats{
		TotalAmount:    NumericToFloat64(row.TotalAmount),
		TotalPaid:      NumericToFloat64(row.TotalPaid),
		TotalRemaining: NumericToFloat64(row.TotalRemaining),
		TotalCount:     int(row.TotalCount),
		OpenCount:      int(row.OpenCount),
		PartialCount:   int(row.PartialCount),
		PaidCount:      int(row.PaidCount),
	}, nil
}

func (r *pgDebtRepository) ListActiveApartmentsForAccrual(ctx context.Context, siteID string) ([]db.ListActiveApartmentsForAccrualRow, error) {
	return r.queries.ListActiveApartmentsForAccrual(ctx, StringToUUID(siteID))
}

func (r *pgDebtRepository) TransferOpenDebtsToOwner(ctx context.Context, apartmentID, oldTenantID, ownerID string) error {
	return r.queries.TransferOpenDebtsToOwner(ctx, db.TransferOpenDebtsToOwnerParams{
		ApartmentID:  StringToUUID(apartmentID),
		DebtorUserID: StringToUUID(oldTenantID),
		DebtorUserID_2: StringToUUID(ownerID),
	})
}

func (r *pgDebtRepository) DeleteOpenDebtsByDebtor(ctx context.Context, apartmentID, debtorID string) error {
	return r.queries.DeleteOpenDebtsByDebtor(ctx, db.DeleteOpenDebtsByDebtorParams{
		ApartmentID:  StringToUUID(apartmentID),
		DebtorUserID: StringToUUID(debtorID),
	})
}

func (r *pgDebtRepository) Delete(ctx context.Context, id, siteID string) error {
	return r.queries.DeleteDebtByID(ctx, db.DeleteDebtByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

func (r *pgDebtRepository) UpdateStatus(ctx context.Context, id string, status domain.DebtStatus) error {
	return r.queries.UpdateDebtStatus(ctx, db.UpdateDebtStatusParams{
		ID:     StringToUUID(id),
		Status: string(status),
	})
}

