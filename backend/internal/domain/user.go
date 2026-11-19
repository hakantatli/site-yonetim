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
	ID                 string    `json:"id"`
	SiteID             *string   `json:"site_id,omitempty"`
	Phone              string    `json:"phone"`           // Zorunlu alan
	Email              *string   `json:"email,omitempty"` // Opsiyonel alan
	FullName           string    `json:"full_name"`
	Role               UserRole  `json:"role"`
	IsActive           bool      `json:"is_active"`
	MustChangePassword bool      `json:"must_change_password"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type ChangePasswordRequest struct {
	CurrentPassword *string `json:"current_password,omitempty"`
	NewPassword     string  `json:"new_password"`
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

// CleanPhone strips non-digit characters and ensures leading 0 for 10-digit Turkish numbers.
func CleanPhone(value string) string {
	if strings.TrimSpace(value) == "" {
		return ""
	}
	var digits strings.Builder
	for _, r := range value {
		if r >= '0' && r <= '9' {
			digits.WriteRune(r)
		}
	}
	s := digits.String()
	if len(s) == 10 && strings.HasPrefix(s, "5") {
		return "0" + s
	}
	return s
}

// DemoPhoneNumbers contains phone numbers allocated for simulation and showcase accounts.
var DemoPhoneNumbers = map[string]bool{
	"05551234567": true,
	"05423010001": true,
	"05423010002": true,
	"05423010003": true,
	"05423010004": true,
	"05423010005": true,
	"05321010001": true,
	"05321010002": true,
	"05321010003": true,
	"05321010004": true,
	"05321010005": true,
	"05321010006": true,
	"05321010007": true,
	"05321010008": true,
	"05321010009": true,
}

// IsDemoPhone returns true if the phone belongs to a seeded demo account.
func IsDemoPhone(phone string) bool {
	clean := CleanPhone(phone)
	return DemoPhoneNumbers[clean]
}

func (r *LoginRequest) GetIdentifier() string {
	raw := ""
	if strings.TrimSpace(r.Login) != "" {
		raw = strings.TrimSpace(r.Login)
	} else if r.Phone != nil && strings.TrimSpace(*r.Phone) != "" {
		raw = strings.TrimSpace(*r.Phone)
	} else if r.Email != nil && strings.TrimSpace(*r.Email) != "" {
		return strings.TrimSpace(*r.Email)
	}

	if raw != "" && !strings.Contains(raw, "@") {
		cleaned := CleanPhone(raw)
		if cleaned != "" {
			return cleaned
		}
	}
	return raw
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type UpdateResidentRequest struct {
	FullName string  `json:"full_name"`
	Phone    string  `json:"phone"`
	Email    *string `json:"email,omitempty"`
	Password *string `json:"password,omitempty"`
}

type RegisterAdminRequest struct {
	FullName    string  `json:"full_name"`
	Phone       string  `json:"phone"`
	Email       *string `json:"email,omitempty"`
	Password    string  `json:"password"`
	SiteName    string  `json:"site_name"`
	SiteAddress *string `json:"site_address,omitempty"`
}

