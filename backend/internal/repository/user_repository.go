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
	ErrUserNotFound = errors.New("user not found")
)

type UserRepository interface {
	GetByPhoneOrEmail(ctx context.Context, identifier string) (*domain.User, string, error)
	GetByPhone(ctx context.Context, phone string) (*domain.User, string, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, string, error)
	GetByID(ctx context.Context, id string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User, passwordHash string) (*domain.User, error)
	CountOwners(ctx context.Context) (int64, error)
	ListAdminsBySiteID(ctx context.Context, siteID string) ([]domain.User, error)
}

type pgUserRepository struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) UserRepository {
	return &pgUserRepository{
		queries: db.New(pool),
		pool:    pool,
	}
}

func (r *pgUserRepository) GetByPhoneOrEmail(ctx context.Context, identifier string) (*domain.User, string, error) {
	row, err := r.queries.GetUserByPhoneOrEmail(ctx, identifier)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrUserNotFound
		}
		return nil, "", err
	}

	u := &domain.User{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToPtrString(row.SiteID),
		Phone:     row.Phone,
		Email:     TextToPtrString(row.Email),
		FullName:  row.FullName,
		Role:      domain.UserRole(row.Role),
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
	return u, row.PasswordHash, nil
}

func (r *pgUserRepository) GetByPhone(ctx context.Context, phone string) (*domain.User, string, error) {
	row, err := r.queries.GetUserByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrUserNotFound
		}
		return nil, "", err
	}

	u := &domain.User{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToPtrString(row.SiteID),
		Phone:     row.Phone,
		Email:     TextToPtrString(row.Email),
		FullName:  row.FullName,
		Role:      domain.UserRole(row.Role),
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
	return u, row.PasswordHash, nil
}

func (r *pgUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, string, error) {
	row, err := r.queries.GetUserByEmail(ctx, PtrStringToText(&email))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, "", ErrUserNotFound
		}
		return nil, "", err
	}

	u := &domain.User{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToPtrString(row.SiteID),
		Phone:     row.Phone,
		Email:     TextToPtrString(row.Email),
		FullName:  row.FullName,
		Role:      domain.UserRole(row.Role),
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
	return u, row.PasswordHash, nil
}

func (r *pgUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	row, err := r.queries.GetUserByID(ctx, StringToUUID(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	u := &domain.User{
		ID:        UUIDToString(row.ID),
		SiteID:    UUIDToPtrString(row.SiteID),
		Phone:     row.Phone,
		Email:     TextToPtrString(row.Email),
		FullName:  row.FullName,
		Role:      domain.UserRole(row.Role),
		IsActive:  row.IsActive,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
	return u, nil
}

func (r *pgUserRepository) Create(ctx context.Context, user *domain.User, passwordHash string) (*domain.User, error) {
	created, err := r.queries.CreateUser(ctx, db.CreateUserParams{
		SiteID:       PtrStringToUUID(user.SiteID),
		Phone:        user.Phone,
		Email:        PtrStringToText(user.Email),
		PasswordHash: passwordHash,
		FullName:     user.FullName,
		Role:         string(user.Role),
		IsActive:     user.IsActive,
	})
	if err != nil {
		return nil, err
	}

	return &domain.User{
		ID:        UUIDToString(created.ID),
		SiteID:    UUIDToPtrString(created.SiteID),
		Phone:     created.Phone,
		Email:     TextToPtrString(created.Email),
		FullName:  created.FullName,
		Role:      domain.UserRole(created.Role),
		IsActive:  created.IsActive,
		CreatedAt: created.CreatedAt.Time,
		UpdatedAt: created.UpdatedAt.Time,
	}, nil
}

func (r *pgUserRepository) CountOwners(ctx context.Context) (int64, error) {
	return r.queries.CountUsersByRole(ctx, string(domain.RoleOwner))
}

func (r *pgUserRepository) ListAdminsBySiteID(ctx context.Context, siteID string) ([]domain.User, error) {
	rows, err := r.queries.ListAdminsBySiteID(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}

	admins := make([]domain.User, 0, len(rows))
	for _, row := range rows {
		admins = append(admins, domain.User{
			ID:        UUIDToString(row.ID),
			SiteID:    UUIDToPtrString(row.SiteID),
			Phone:     row.Phone,
			Email:     TextToPtrString(row.Email),
			FullName:  row.FullName,
			Role:      domain.UserRole(row.Role),
			IsActive:  row.IsActive,
			CreatedAt: row.CreatedAt.Time,
			UpdatedAt: row.UpdatedAt.Time,
		})
	}
	return admins, nil
}
