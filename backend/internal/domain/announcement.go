package domain

import (
	"errors"
	"time"
)

type AnnouncementPriority string

const (
	AnnouncementPriorityNormal    AnnouncementPriority = "normal"
	AnnouncementPriorityImportant AnnouncementPriority = "important"
	AnnouncementPriorityUrgent    AnnouncementPriority = "urgent"
)

func IsValidAnnouncementPriority(p string) bool {
	switch AnnouncementPriority(p) {
	case AnnouncementPriorityNormal, AnnouncementPriorityImportant, AnnouncementPriorityUrgent:
		return true
	default:
		return false
	}
}

var (
	ErrAnnouncementNotFound        = errors.New("duyuru bulunamadı")
	ErrInvalidAnnouncementTitle    = errors.New("duyuru başlığı zorunludur")
	ErrInvalidAnnouncementContent  = errors.New("duyuru içeriği zorunludur")
	ErrInvalidAnnouncementPriority = errors.New("geçersiz duyuru öncelik derecesi (normal, important veya urgent olmalıdır)")
)

type Announcement struct {
	ID          string               `json:"id"`
	SiteID      string               `json:"site_id"`
	Title       string               `json:"title"`
	Content     string               `json:"content"`
	Priority    AnnouncementPriority `json:"priority"`
	PublishedAt time.Time            `json:"published_at"`
	CreatedBy   string               `json:"created_by"`
	AuthorName  string               `json:"author_name"`
	CreatedAt   time.Time            `json:"created_at"`
	UpdatedAt   time.Time            `json:"updated_at"`
}

type CreateAnnouncementRequest struct {
	Title    string               `json:"title"`
	Content  string               `json:"content"`
	Priority AnnouncementPriority `json:"priority"`
}

type UpdateAnnouncementRequest struct {
	Title    string               `json:"title"`
	Content  string               `json:"content"`
	Priority AnnouncementPriority `json:"priority"`
}
