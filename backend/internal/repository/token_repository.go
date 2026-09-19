package repository

import (
	"context"
	"errors"
	"time"

	"github.com/hakantatli/site-yonetim/internal/repository/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrTokenNotFound = errors.New("refresh token not found or invalid")
)

type TokenRepository interface {
	CreateRefreshToken(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error
	GetRefreshToken(ctx context.Context, tokenHash string) (userID string, expiresAt time.Time, err error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
	RevokeUserRefreshTokens(ctx context.Context, userID string) error
}

type pgTokenRepository struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewTokenRepository(pool *pgxpool.Pool) TokenRepository {
	return &pgTokenRepository{
		queries: db.New(pool),
		pool:    pool,
	}
}

func (r *pgTokenRepository) CreateRefreshToken(ctx context.Context, userID string, tokenHash string, expiresAt time.Time) error {
	_, err := r.queries.CreateRefreshToken(ctx, db.CreateRefreshTokenParams{
		UserID:    StringToUUID(userID),
		TokenHash: tokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: expiresAt, Valid: true},
	})
	return err
}

func (r *pgTokenRepository) GetRefreshToken(ctx context.Context, tokenHash string) (string, time.Time, error) {
	row, err := r.queries.GetRefreshToken(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", time.Time{}, ErrTokenNotFound
		}
		return "", time.Time{}, err
	}
	return UUIDToString(row.UserID), row.ExpiresAt.Time, nil
}

func (r *pgTokenRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.queries.RevokeRefreshToken(ctx, tokenHash)
	return err
}

func (r *pgTokenRepository) RevokeUserRefreshTokens(ctx context.Context, userID string) error {
	return r.queries.RevokeUserRefreshTokens(ctx, StringToUUID(userID))
}
