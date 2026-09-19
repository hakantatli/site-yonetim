package repository

import (
	"context"
	"errors"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrSiteNotFound = errors.New("site not found")
)

type SiteRepository interface {
	Create(ctx context.Context, name string, address *string, limit int32) (*domain.Site, error)
	List(ctx context.Context) ([]domain.Site, error)
	GetByID(ctx context.Context, id string) (*domain.Site, error)
	GetDetails(ctx context.Context, id string) (*domain.SiteDetail, error)
	UpdateLimit(ctx context.Context, id string, limit int32) (*domain.Site, error)
	CreateDefaultCategories(ctx context.Context, siteID string) error
}

type pgSiteRepository struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewSiteRepository(pool *pgxpool.Pool) SiteRepository {
	return &pgSiteRepository{
		queries: db.New(pool),
		pool:    pool,
	}
}

func (r *pgSiteRepository) Create(ctx context.Context, name string, address *string, limit int32) (*domain.Site, error) {
	row, err := r.queries.CreateSite(ctx, db.CreateSiteParams{
		Name:            name,
		Address:         PtrStringToText(address),
		ApartmentLimit: limit,
	})
	if err != nil {
		return nil, err
	}

	return &domain.Site{
		ID:             UUIDToString(row.ID),
		Name:           row.Name,
		Address:        TextToPtrString(row.Address),
		ApartmentLimit: row.ApartmentLimit,
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
		ApartmentCount: 0,
		AdminCount:     0,
	}, nil
}

func (r *pgSiteRepository) List(ctx context.Context) ([]domain.Site, error) {
	rows, err := r.queries.ListSites(ctx)
	if err != nil {
		return nil, err
	}

	sites := make([]domain.Site, 0, len(rows))
	for _, row := range rows {
		sites = append(sites, domain.Site{
			ID:             UUIDToString(row.ID),
			Name:           row.Name,
			Address:        TextToPtrString(row.Address),
			ApartmentLimit: row.ApartmentLimit,
			CreatedAt:      row.CreatedAt.Time,
			UpdatedAt:      row.UpdatedAt.Time,
			ApartmentCount: row.ApartmentCount,
			AdminCount:     row.AdminCount,
		})
	}
	return sites, nil
}

func (r *pgSiteRepository) GetByID(ctx context.Context, id string) (*domain.Site, error) {
	row, err := r.queries.GetSiteByID(ctx, StringToUUID(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSiteNotFound
		}
		return nil, err
	}

	return &domain.Site{
		ID:             UUIDToString(row.ID),
		Name:           row.Name,
		Address:        TextToPtrString(row.Address),
		ApartmentLimit: row.ApartmentLimit,
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}, nil
}

func (r *pgSiteRepository) GetDetails(ctx context.Context, id string) (*domain.SiteDetail, error) {
	row, err := r.queries.GetSiteDetails(ctx, StringToUUID(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSiteNotFound
		}
		return nil, err
	}

	return &domain.SiteDetail{
		Site: domain.Site{
			ID:             UUIDToString(row.ID),
			Name:           row.Name,
			Address:        TextToPtrString(row.Address),
			ApartmentLimit: row.ApartmentLimit,
			CreatedAt:      row.CreatedAt.Time,
			UpdatedAt:      row.UpdatedAt.Time,
			ApartmentCount: row.ApartmentCount,
		},
		BlockCount:    row.BlockCount,
		ResidentCount: row.ResidentCount,
		Admins:        nil, // populated by service
	}, nil
}

func (r *pgSiteRepository) UpdateLimit(ctx context.Context, id string, limit int32) (*domain.Site, error) {
	row, err := r.queries.UpdateSiteLimit(ctx, db.UpdateSiteLimitParams{
		ID:             StringToUUID(id),
		ApartmentLimit: limit,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrSiteNotFound
		}
		return nil, err
	}

	return &domain.Site{
		ID:             UUIDToString(row.ID),
		Name:           row.Name,
		Address:        TextToPtrString(row.Address),
		ApartmentLimit: row.ApartmentLimit,
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}, nil
}

func (r *pgSiteRepository) CreateDefaultCategories(ctx context.Context, siteID string) error {
	defaultCategories := []string{
		"Elektrik / Su",
		"Temizlik",
		"Asansör Bakımı",
		"Personel / Görevli",
		"Demirbaş / Onarım",
		"Genel Giderler",
	}

	for _, catName := range defaultCategories {
		_, err := r.queries.CreateExpenseCategory(ctx, db.CreateExpenseCategoryParams{
			SiteID:    StringToUUID(siteID),
			Name:      catName,
			IsDefault: true,
			IsActive:  true,
		})
		if err != nil {
			return err
		}
	}
	return nil
}
