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

type AnnouncementRepository interface {
	Create(ctx context.Context, siteID string, title string, content string, priority domain.AnnouncementPriority, publishedAt time.Time, createdBy string) (*domain.Announcement, error)
	ListBySite(ctx context.Context, siteID string) ([]domain.Announcement, error)
	GetByID(ctx context.Context, id string, siteID string) (*domain.Announcement, error)
	Update(ctx context.Context, id string, siteID string, title string, content string, priority domain.AnnouncementPriority) (*domain.Announcement, error)
	Delete(ctx context.Context, id string, siteID string) error
}

type pgAnnouncementRepository struct {
	queries *db.Queries
	pool    *pgxpool.Pool
}

func NewAnnouncementRepository(pool *pgxpool.Pool) AnnouncementRepository {
	return &pgAnnouncementRepository{
		queries: db.New(pool),
		pool:    pool,
	}
}

func (r *pgAnnouncementRepository) Create(
	ctx context.Context,
	siteID string,
	title string,
	content string,
	priority domain.AnnouncementPriority,
	publishedAt time.Time,
	createdBy string,
) (*domain.Announcement, error) {
	row, err := r.queries.CreateAnnouncement(ctx, db.CreateAnnouncementParams{
		SiteID:      StringToUUID(siteID),
		Title:       title,
		Content:     content,
		Priority:    string(priority),
		PublishedAt: pgtype.Timestamptz{Time: publishedAt, Valid: true},
		CreatedBy:   StringToUUID(createdBy),
	})
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, UUIDToString(row.ID), siteID)
}

func (r *pgAnnouncementRepository) ListBySite(ctx context.Context, siteID string) ([]domain.Announcement, error) {
	rows, err := r.queries.ListAnnouncementsBySite(ctx, StringToUUID(siteID))
	if err != nil {
		return nil, err
	}

	announcements := make([]domain.Announcement, len(rows))
	for i, row := range rows {
		announcements[i] = domain.Announcement{
			ID:          UUIDToString(row.ID),
			SiteID:      UUIDToString(row.SiteID),
			Title:       row.Title,
			Content:     row.Content,
			Priority:    domain.AnnouncementPriority(row.Priority),
			PublishedAt: row.PublishedAt.Time,
			CreatedBy:   UUIDToString(row.CreatedBy),
			AuthorName:  row.AuthorName,
			CreatedAt:   row.CreatedAt.Time,
			UpdatedAt:   row.UpdatedAt.Time,
		}
	}

	return announcements, nil
}

func (r *pgAnnouncementRepository) GetByID(ctx context.Context, id string, siteID string) (*domain.Announcement, error) {
	row, err := r.queries.GetAnnouncementByID(ctx, db.GetAnnouncementByIDParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAnnouncementNotFound
		}
		return nil, err
	}

	return &domain.Announcement{
		ID:          UUIDToString(row.ID),
		SiteID:      UUIDToString(row.SiteID),
		Title:       row.Title,
		Content:     row.Content,
		Priority:    domain.AnnouncementPriority(row.Priority),
		PublishedAt: row.PublishedAt.Time,
		CreatedBy:   UUIDToString(row.CreatedBy),
		AuthorName:  row.AuthorName,
		CreatedAt:   row.CreatedAt.Time,
		UpdatedAt:   row.UpdatedAt.Time,
	}, nil
}

func (r *pgAnnouncementRepository) Update(
	ctx context.Context,
	id string,
	siteID string,
	title string,
	content string,
	priority domain.AnnouncementPriority,
) (*domain.Announcement, error) {
	_, err := r.queries.UpdateAnnouncement(ctx, db.UpdateAnnouncementParams{
		ID:       StringToUUID(id),
		SiteID:   StringToUUID(siteID),
		Title:    title,
		Content:  content,
		Priority: string(priority),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrAnnouncementNotFound
		}
		return nil, err
	}

	return r.GetByID(ctx, id, siteID)
}

func (r *pgAnnouncementRepository) Delete(ctx context.Context, id string, siteID string) error {
	return r.queries.DeleteAnnouncement(ctx, db.DeleteAnnouncementParams{
		ID:     StringToUUID(id),
		SiteID: StringToUUID(siteID),
	})
}
