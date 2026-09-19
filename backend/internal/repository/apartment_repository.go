package repository

import (
	"context"
	"errors"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrApartmentNotFound = errors.New("apartment not found")
	ErrBlockNotFound     = errors.New("block not found")
)

type ApartmentRepository interface {
	// Blocks
	CreateBlock(ctx context.Context, siteID string, name string) (*domain.Block, error)
	ListBlocks(ctx context.Context, siteID string) ([]domain.Block, error)
	DeleteBlock(ctx context.Context, id string, siteID string) error

	// Apartments
	CountActiveApartments(ctx context.Context, siteID string) (int64, error)
	ListApartments(ctx context.Context, siteID string) ([]domain.Apartment, error)
	GetApartmentByID(ctx context.Context, id string, siteID string) (*domain.Apartment, error)
	CreateApartment(ctx context.Context, siteID string, blockID *string, doorNumber string, floor *int32, ownerUserID *string, tenantUserID *string) (*domain.Apartment, error)
	UpdateApartment(ctx context.Context, id string, siteID string, blockID *string, doorNumber string, floor *int32) (*domain.Apartment, error)
	SoftDeleteApartment(ctx context.Context, id string, siteID string) error
	SetApartmentOwner(ctx context.Context, id string, siteID string, ownerUserID string) error
	SetApartmentTenant(ctx context.Context, id string, siteID string, tenantUserID string) error
	RemoveApartmentTenant(ctx context.Context, id string, siteID string) error

	// Tenant History & Debts
	CreateTenantHistory(ctx context.Context, apartmentID string, tenantUserID string, startedAt time.Time, recordedBy *string) error
	EndTenantHistory(ctx context.Context, apartmentID string, tenantUserID string, endedAt time.Time, debtAction string, notes *string) error
	ListTenantHistory(ctx context.Context, apartmentID string) ([]domain.TenantHistoryItem, error)
	TransferOpenDebtsToOwner(ctx context.Context, apartmentID string, oldDebtorID string, newDebtorID string) error
	DeleteOpenDebtsByDebtor(ctx context.Context, apartmentID string, debtorID string) error
}

type pgApartmentRepository struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewApartmentRepository(pool *pgxpool.Pool) ApartmentRepository {
	return &pgApartmentRepository{
		queries: db.New(pool),
		pool:    pool,
	}
}

// Blocks
func (r *pgApartmentRepository) CreateBlock(ctx context.Context, siteID string, name string) (*domain.Block, error) {
	row, err := r.queries.CreateBlock(ctx, db.CreateBlockParams{
		SiteID: StringToUUID(siteID),
		Name:   name,
	})
	if err != nil {
		return nil, err
	}
	return &domain.Block{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToString(row.SiteID),
		Name:      row.Name,
		CreatedAt: row.CreatedAt.Time,
	}, nil
}

func (r *pgApartmentRepository) ListBlocks(ctx context.Context, siteID string) ([]domain.Block, error) {
	rows, err := r.queries.ListBlocksBySiteID(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}
	blocks := make([]domain.Block, 0, len(rows))
	for _, row := range rows {
		blocks = append(blocks, domain.Block{
			ID:        UUIDToString(row.ID),
			SiteID:    UUIDToString(row.SiteID),
			Name:      row.Name,
			CreatedAt: row.CreatedAt.Time,
		})
	}
	return blocks, nil
}

func (r *pgApartmentRepository) DeleteBlock(ctx context.Context, id string, siteID string) error {
	return r.queries.DeleteBlock(ctx, db.DeleteBlockParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

// Apartments
func (r *pgApartmentRepository) CountActiveApartments(ctx context.Context, siteID string) (int64, error) {
	return r.queries.CountActiveApartmentsBySiteID(ctx, StringToUUID(siteID))
}

func (r *pgApartmentRepository) ListApartments(ctx context.Context, siteID string) ([]domain.Apartment, error) {
	rows, err := r.queries.ListApartmentsBySiteID(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}
	apartments := make([]domain.Apartment, 0, len(rows))
	for _, row := range rows {
		var floor *int32
		if row.Floor.Valid {
			floor = &row.Floor.Int32
		}

		apartments = append(apartments, domain.Apartment{
			ID:             UUIDToString(row.ID),
			SiteID:         UUIDToString(row.SiteID),
			BlockID:        UUIDToPtrString(row.BlockID),
			BlockName:      TextToPtrString(row.BlockName),
			DoorNumber:     row.DoorNumber,
			Floor:          floor,
			OwnerUserID:    UUIDToPtrString(row.OwnerUserID),
			OwnerFullName:  TextToPtrString(row.OwnerFullName),
			OwnerPhone:     TextToPtrString(row.OwnerPhone),
			OwnerEmail:     TextToPtrString(row.OwnerEmail),
			TenantUserID:   UUIDToPtrString(row.TenantUserID),
			TenantFullName: TextToPtrString(row.TenantFullName),
			TenantPhone:    TextToPtrString(row.TenantPhone),
			TenantEmail:    TextToPtrString(row.TenantEmail),
			IsActive:       row.IsActive,
			CreatedAt:      row.CreatedAt.Time,
			UpdatedAt:      row.UpdatedAt.Time,
		})
	}
	return apartments, nil
}

func (r *pgApartmentRepository) GetApartmentByID(ctx context.Context, id string, siteID string) (*domain.Apartment, error) {
	row, err := r.queries.GetApartmentByID(ctx, db.GetApartmentByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrApartmentNotFound
		}
		return nil, err
	}

	var floor *int32
	if row.Floor.Valid {
		floor = &row.Floor.Int32
	}

	return &domain.Apartment{
		ID:             UUIDToString(row.ID),
		SiteID:         UUIDToString(row.SiteID),
		BlockID:        UUIDToPtrString(row.BlockID),
		BlockName:      TextToPtrString(row.BlockName),
		DoorNumber:     row.DoorNumber,
		Floor:          floor,
		OwnerUserID:    UUIDToPtrString(row.OwnerUserID),
		OwnerFullName:  TextToPtrString(row.OwnerFullName),
		OwnerPhone:     TextToPtrString(row.OwnerPhone),
		OwnerEmail:     TextToPtrString(row.OwnerEmail),
		TenantUserID:   UUIDToPtrString(row.TenantUserID),
		TenantFullName: TextToPtrString(row.TenantFullName),
		TenantPhone:    TextToPtrString(row.TenantPhone),
		TenantEmail:    TextToPtrString(row.TenantEmail),
		IsActive:       row.IsActive,
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}, nil
}

func (r *pgApartmentRepository) CreateApartment(ctx context.Context, siteID string, blockID *string, doorNumber string, floor *int32, ownerUserID *string, tenantUserID *string) (*domain.Apartment, error) {
	var floorVal pgtype.Int4
	if floor != nil {
		floorVal = pgtype.Int4{Int32: *floor, Valid: true}
	}

	row, err := r.queries.CreateApartment(ctx, db.CreateApartmentParams{
		SiteID:       StringToUUID(siteID),
		BlockID:      PtrStringToUUID(blockID),
		DoorNumber:   doorNumber,
		Floor:        floorVal,
		OwnerUserID:  PtrStringToUUID(ownerUserID),
		TenantUserID: PtrStringToUUID(tenantUserID),
	})
	if err != nil {
		return nil, err
	}

	return r.GetApartmentByID(ctx, UUIDToString(row.ID), siteID)
}

func (r *pgApartmentRepository) UpdateApartment(ctx context.Context, id string, siteID string, blockID *string, doorNumber string, floor *int32) (*domain.Apartment, error) {
	var floorVal pgtype.Int4
	if floor != nil {
		floorVal = pgtype.Int4{Int32: *floor, Valid: true}
	}

	_, err := r.queries.UpdateApartment(ctx, db.UpdateApartmentParams{
		ID:         StringToUUID(id),
		SiteID:     StringToUUID(siteID),
		BlockID:    PtrStringToUUID(blockID),
		DoorNumber: doorNumber,
		Floor:      floorVal,
	})
	if err != nil {
		return nil, err
	}

	return r.GetApartmentByID(ctx, id, siteID)
}

func (r *pgApartmentRepository) SoftDeleteApartment(ctx context.Context, id string, siteID string) error {
	return r.queries.SoftDeleteApartment(ctx, db.SoftDeleteApartmentParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

func (r *pgApartmentRepository) SetApartmentOwner(ctx context.Context, id string, siteID string, ownerUserID string) error {
	return r.queries.SetApartmentOwner(ctx, db.SetApartmentOwnerParams{
		ID:          StringToUUID(id),
		SiteID:      StringToUUID(siteID),
		OwnerUserID: StringToUUID(ownerUserID),
	})
}

func (r *pgApartmentRepository) SetApartmentTenant(ctx context.Context, id string, siteID string, tenantUserID string) error {
	return r.queries.SetApartmentTenant(ctx, db.SetApartmentTenantParams{
		ID:           StringToUUID(id),
		SiteID:       StringToUUID(siteID),
		TenantUserID: StringToUUID(tenantUserID),
	})
}

func (r *pgApartmentRepository) RemoveApartmentTenant(ctx context.Context, id string, siteID string) error {
	return r.queries.RemoveApartmentTenant(ctx, db.RemoveApartmentTenantParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}

func (r *pgApartmentRepository) CreateTenantHistory(ctx context.Context, apartmentID string, tenantUserID string, startedAt time.Time, recordedBy *string) error {
	_, err := r.queries.CreateTenantHistory(ctx, db.CreateTenantHistoryParams{
		ApartmentID:  StringToUUID(apartmentID),
		TenantUserID: StringToUUID(tenantUserID),
		StartedAt:    pgtype.Date{Time: startedAt, Valid: true},
		RecordedBy:   PtrStringToUUID(recordedBy),
	})
	return err
}

func (r *pgApartmentRepository) EndTenantHistory(ctx context.Context, apartmentID string, tenantUserID string, endedAt time.Time, debtAction string, notes *string) error {
	return r.queries.EndTenantHistory(ctx, db.EndTenantHistoryParams{
		ApartmentID:  StringToUUID(apartmentID),
		TenantUserID: StringToUUID(tenantUserID),
		EndedAt:      pgtype.Date{Time: endedAt, Valid: true},
		DebtAction:   PtrStringToText(&debtAction),
		Notes:        PtrStringToText(notes),
	})
}

func (r *pgApartmentRepository) ListTenantHistory(ctx context.Context, apartmentID string) ([]domain.TenantHistoryItem, error) {
	rows, err := r.queries.ListTenantHistoryByApartmentID(ctx, StringToUUID(apartmentID))
	if err != nil {
		return nil, err
	}
	history := make([]domain.TenantHistoryItem, 0, len(rows))
	for _, row := range rows {
		var endedAt *time.Time
		if row.EndedAt.Valid {
			endedAt = &row.EndedAt.Time
		}
		history = append(history, domain.TenantHistoryItem{
			ID:             UUIDToString(row.ID),
			ApartmentID:    UUIDToString(row.ApartmentID),
			TenantUserID:   UUIDToString(row.TenantUserID),
			TenantFullName: row.TenantFullName,
			TenantPhone:    row.TenantPhone,
			TenantEmail:    TextToPtrString(row.TenantEmail),
			StartedAt:      row.StartedAt.Time,
			EndedAt:        endedAt,
			DebtAction:     TextToPtrString(row.DebtAction),
			Notes:          TextToPtrString(row.Notes),
			CreatedAt:      row.CreatedAt.Time,
		})
	}
	return history, nil
}

func (r *pgApartmentRepository) TransferOpenDebtsToOwner(ctx context.Context, apartmentID string, oldDebtorID string, newDebtorID string) error {
	return r.queries.TransferOpenDebtsToOwner(ctx, db.TransferOpenDebtsToOwnerParams{
		ApartmentID:    StringToUUID(apartmentID),
		DebtorUserID:   StringToUUID(oldDebtorID),
		DebtorUserID_2: StringToUUID(newDebtorID),
	})
}

func (r *pgApartmentRepository) DeleteOpenDebtsByDebtor(ctx context.Context, apartmentID string, debtorID string) error {
	return r.queries.DeleteOpenDebtsByDebtor(ctx, db.DeleteOpenDebtsByDebtorParams{
		ApartmentID:  StringToUUID(apartmentID),
		DebtorUserID: StringToUUID(debtorID),
	})
}
