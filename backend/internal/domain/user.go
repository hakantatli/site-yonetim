package domain

import (
	"strings"
	"time"
)

type UserRole string

const (
	RoleOwner    UserRole = "owner"
	RoleAdmin    UserRole = "admin"
	RoleResident UserRole = "resident"
)

type User struct {
	ID        string    `json:"id"`
	SiteID    *string   `json:"site_id,omitempty"`
	Phone     string    `json:"phone"`           // Zorunlu alan
	Email     *string   `json:"email,omitempty"` // Opsiyonel alan
	FullName  string    `json:"full_name"`
	Role      UserRole  `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         User      `json:"user"`
}

type LoginRequest struct {
	Login    string  `json:"login"`              // Telefon veya e-posta
	Phone    *string `json:"phone,omitempty"`    // Telefon alanı
	Email    *string `json:"email,omitempty"`    // E-posta alanı
	Password string  `json:"password"`
}

func (r *LoginRequest) GetIdentifier() string {
	if strings.TrimSpace(r.Login) != "" {
		return strings.TrimSpace(r.Login)
	}
	if r.Phone != nil && strings.TrimSpace(*r.Phone) != "" {
		return strings.TrimSpace(*r.Phone)
	}
	if r.Email != nil && strings.TrimSpace(*r.Email) != "" {
		return strings.TrimSpace(*r.Email)
	}
	return ""
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}
