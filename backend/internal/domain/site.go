package domain

import "time"

type Site struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Address        *string   `json:"address,omitempty"`
	ApartmentLimit int32     `json:"apartment_limit"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	ApartmentCount int32     `json:"apartment_count"`
	AdminCount     int32     `json:"admin_count"`
}

type SiteDetail struct {
	Site
	BlockCount    int32   `json:"block_count"`
	ResidentCount int32   `json:"resident_count"`
	Admins        []User  `json:"admins"`
}

type CreateSiteRequest struct {
	Name           string  `json:"name"`
	Address        *string `json:"address,omitempty"`
	ApartmentLimit *int32  `json:"apartment_limit,omitempty"`
}

type UpdateLimitRequest struct {
	ApartmentLimit int32 `json:"apartment_limit"`
}

type CreateAdminRequest struct {
	Phone    string  `json:"phone"`           // Zorunlu alan
	Email    *string `json:"email,omitempty"` // Opsiyonel alan
	Password string  `json:"password"`
	FullName string  `json:"full_name"`
}
