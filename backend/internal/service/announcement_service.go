package service

import (
	"context"
	"strings"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/repository"
)

type AnnouncementService interface {
	CreateAnnouncement(ctx context.Context, siteID string, req domain.CreateAnnouncementRequest, createdBy string) (*domain.Announcement, error)
	ListAnnouncements(ctx context.Context, siteID string) ([]domain.Announcement, error)
	GetAnnouncementByID(ctx context.Context, id string, siteID string) (*domain.Announcement, error)
	UpdateAnnouncement(ctx context.Context, id string, siteID string, req domain.UpdateAnnouncementRequest) (*domain.Announcement, error)
	DeleteAnnouncement(ctx context.Context, id string, siteID string) error
}

type announcementService struct {
	announcementRepo repository.AnnouncementRepository
}

func NewAnnouncementService(announcementRepo repository.AnnouncementRepository) AnnouncementService {
	return &announcementService{
		announcementRepo: announcementRepo,
	}
}

func (s *announcementService) CreateAnnouncement(
	ctx context.Context,
	siteID string,
	req domain.CreateAnnouncementRequest,
	createdBy string,
) (*domain.Announcement, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, domain.ErrInvalidAnnouncementTitle
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, domain.ErrInvalidAnnouncementContent
	}

	priority := req.Priority
	if priority == "" {
		priority = domain.AnnouncementPriorityNormal
	}
	if !domain.IsValidAnnouncementPriority(string(priority)) {
		return nil, domain.ErrInvalidAnnouncementPriority
	}

	publishedAt := time.Now().UTC()

	announcement, err := s.announcementRepo.Create(ctx, siteID, title, content, priority, publishedAt, createdBy)
	if err != nil {
		return nil, err
	}

	// TODO: Bildirim hook noktası — yeni duyuru sakinlere e-posta/SMS gönderimi

	return announcement, nil
}

func (s *announcementService) ListAnnouncements(ctx context.Context, siteID string) ([]domain.Announcement, error) {
	return s.announcementRepo.ListBySite(ctx, siteID)
}

func (s *announcementService) GetAnnouncementByID(ctx context.Context, id string, siteID string) (*domain.Announcement, error) {
	return s.announcementRepo.GetByID(ctx, id, siteID)
}

func (s *announcementService) UpdateAnnouncement(
	ctx context.Context,
	id string,
	siteID string,
	req domain.UpdateAnnouncementRequest,
) (*domain.Announcement, error) {
	title := strings.TrimSpace(req.Title)
	if title == "" {
		return nil, domain.ErrInvalidAnnouncementTitle
	}

	content := strings.TrimSpace(req.Content)
	if content == "" {
		return nil, domain.ErrInvalidAnnouncementContent
	}

	priority := req.Priority
	if priority == "" {
		priority = domain.AnnouncementPriorityNormal
	}
	if !domain.IsValidAnnouncementPriority(string(priority)) {
		return nil, domain.ErrInvalidAnnouncementPriority
	}

	return s.announcementRepo.Update(ctx, id, siteID, title, content, priority)
}

func (s *announcementService) DeleteAnnouncement(ctx context.Context, id string, siteID string) error {
	return s.announcementRepo.Delete(ctx, id, siteID)
}
