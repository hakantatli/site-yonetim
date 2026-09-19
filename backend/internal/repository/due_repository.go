package repository

import (
	"context"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DueRepository interface {
	GetHistory(ctx context.Context, siteID string) ([]domain.DueRate, error)
	GetCurrent(ctx context.Context, siteID string, targetDate string) (*domain.DueRate, error)
	Upsert(ctx context.Context, siteID string, amount float64, validFrom string, createdBy string) (*domain.DueRate, error)
}

type pgDueRepository struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewDueRepository(pool *pgxpool.Pool) DueRepository {
	return &pgDueRepository{
		pool:    pool,
		queries: db.New(pool),
	}
}

func (r *pgDueRepository) GetHistory(ctx context.Context, siteID string) ([]domain.DueRate, error) {
	rows, err := r.queries.GetDueRateHistory(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}

	result := make([]domain.DueRate, len(rows))
	for i, row := range rows {
		result[i] = domain.DueRate{
			ID:            UUIDToString(row.ID),
			SiteID:        UUIDToString(row.SiteID),
			Amount:        NumericToFloat64(row.Amount),
			ValidFrom:     DateToString(row.ValidFrom),
			CreatedBy:     UUIDToString(row.CreatedBy),
			CreatedByName: row.CreatedByName,
			CreatedAt:     row.CreatedAt.Time,
		}
	}
	return result, nil
}

func (r *pgDueRepository) GetCurrent(ctx context.Context, siteID string, targetDate string) (*domain.DueRate, error) {
	row, err := r.queries.GetCurrentDueRate(ctx, db.GetCurrentDueRateParams{
		SiteID:    StringToUUID(siteID),
		ValidFrom: StringToDate(targetDate),
	})
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &domain.DueRate{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToString(row.SiteID),
		Amount:    NumericToFloat64(row.Amount),
		ValidFrom: DateToString(row.ValidFrom),
		CreatedBy: UUIDToString(row.CreatedBy),
		CreatedAt: row.CreatedAt.Time,
	}, nil
}

func (r *pgDueRepository) Upsert(ctx context.Context, siteID string, amount float64, validFrom string, createdBy string) (*domain.DueRate, error) {
	row, err := r.queries.UpsertDueRate(ctx, db.UpsertDueRateParams{
		SiteID:    StringToUUID(siteID),
		Amount:    Float64ToNumeric(amount),
		ValidFrom: StringToDate(validFrom),
		CreatedBy: StringToUUID(createdBy),
	})
	if err != nil {
		return nil, err
	}

	return &domain.DueRate{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToString(row.SiteID),
		Amount:    NumericToFloat64(row.Amount),
		ValidFrom: DateToString(row.ValidFrom),
		CreatedBy: UUIDToString(row.CreatedBy),
		CreatedAt: row.CreatedAt.Time,
	}, nil
}
