package service

import (
	"context"
	"testing"
	"time"

	"github.com/hakantatli/site-yonetim/internal/domain"
)

func TestAnnouncementService_CreateAnnouncement(t *testing.T) {
	ctx := context.Background()

	t.Run("successful announcement creation with normal priority", func(t *testing.T) {
		annRepo := &mockAnnouncementRepository{
			createFn: func(ctx context.Context, siteID, title, content string, priority domain.AnnouncementPriority, publishedAt time.Time, createdBy string) (*domain.Announcement, error) {
				return &domain.Announcement{
					ID:          "ann-1",
					SiteID:      siteID,
					Title:       title,
					Content:     content,
					Priority:    priority,
					PublishedAt: publishedAt,
				}, nil
			},
		}

		svc := NewAnnouncementService(annRepo)
		ann, err := svc.CreateAnnouncement(ctx, "site-1", domain.CreateAnnouncementRequest{
			Title:    "Genel Kurul Toplantısı",
			Content:  "Pazar günü saat 14:00'te sitemizin sığınağında toplanılacaktır.",
			Priority: domain.AnnouncementPriorityImportant,
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if ann.Title != "Genel Kurul Toplantısı" || ann.Priority != domain.AnnouncementPriorityImportant {
			t.Fatalf("mismatched announcement: %+v", ann)
		}
	})

	t.Run("empty priority defaults to normal", func(t *testing.T) {
		var capturedPriority domain.AnnouncementPriority
		annRepo := &mockAnnouncementRepository{
			createFn: func(ctx context.Context, siteID, title, content string, priority domain.AnnouncementPriority, publishedAt time.Time, createdBy string) (*domain.Announcement, error) {
				capturedPriority = priority
				return &domain.Announcement{ID: "ann-2", Priority: priority}, nil
			},
		}

		svc := NewAnnouncementService(annRepo)
		_, err := svc.CreateAnnouncement(ctx, "site-1", domain.CreateAnnouncementRequest{
			Title:   "Su Kesintisi",
			Content: "Yarın 10:00 - 12:00 arası su kesilecektir.",
		}, "admin-1")

		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if capturedPriority != domain.AnnouncementPriorityNormal {
			t.Fatalf("expected default priority normal, got %s", capturedPriority)
		}
	})

	t.Run("empty title returns ErrInvalidAnnouncementTitle", func(t *testing.T) {
		svc := NewAnnouncementService(&mockAnnouncementRepository{})
		_, err := svc.CreateAnnouncement(ctx, "site-1", domain.CreateAnnouncementRequest{
			Title:   "",
			Content: "İçerik var",
		}, "admin-1")

		if err != domain.ErrInvalidAnnouncementTitle {
			t.Fatalf("expected ErrInvalidAnnouncementTitle, got %v", err)
		}
	})

	t.Run("empty content returns ErrInvalidAnnouncementContent", func(t *testing.T) {
		svc := NewAnnouncementService(&mockAnnouncementRepository{})
		_, err := svc.CreateAnnouncement(ctx, "site-1", domain.CreateAnnouncementRequest{
			Title:   "Başlık var",
			Content: "   ",
		}, "admin-1")

		if err != domain.ErrInvalidAnnouncementContent {
			t.Fatalf("expected ErrInvalidAnnouncementContent, got %v", err)
		}
	})

	t.Run("invalid priority returns ErrInvalidAnnouncementPriority", func(t *testing.T) {
		svc := NewAnnouncementService(&mockAnnouncementRepository{})
		_, err := svc.CreateAnnouncement(ctx, "site-1", domain.CreateAnnouncementRequest{
			Title:    "Başlık",
			Content:  "İçerik",
			Priority: "super_critical", // invalid
		}, "admin-1")

		if err != domain.ErrInvalidAnnouncementPriority {
			t.Fatalf("expected ErrInvalidAnnouncementPriority, got %v", err)
		}
	})
}
