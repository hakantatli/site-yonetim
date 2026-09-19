package domain

import "time"

type Block struct {
	ID        string    `json:"id"`
	SiteID    string    `json:"site_id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Apartment struct {
	ID             string    `json:"id"`
	SiteID         string    `json:"site_id"`
	BlockID        *string   `json:"block_id,omitempty"`
	BlockName      *string   `json:"block_name,omitempty"`
	DoorNumber     string    `json:"door_number"`
	Floor          *int32    `json:"floor,omitempty"`
	OwnerUserID    *string   `json:"owner_user_id,omitempty"`
	OwnerFullName  *string   `json:"owner_full_name,omitempty"`
	OwnerPhone     *string   `json:"owner_phone,omitempty"`
	OwnerEmail     *string   `json:"owner_email,omitempty"`
	TenantUserID   *string   `json:"tenant_user_id,omitempty"`
	TenantFullName *string   `json:"tenant_full_name,omitempty"`
	TenantPhone    *string   `json:"tenant_phone,omitempty"`
	TenantEmail    *string   `json:"tenant_email,omitempty"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ResidentInput struct {
	FullName string  `json:"full_name"`
	Phone    string  `json:"phone"`           // Zorunlu alan
	Email    *string `json:"email,omitempty"` // Opsiyonel alan
	Password string  `json:"password"`
}

type CreateApartmentRequest struct {
	BlockID    *string        `json:"block_id,omitempty"`
	DoorNumber string         `json:"door_number"`
	Floor      *int32         `json:"floor,omitempty"`
	Owner      *ResidentInput `json:"owner,omitempty"`
	Tenant     *ResidentInput `json:"tenant,omitempty"`
}

type UpdateApartmentRequest struct {
	BlockID    *string `json:"block_id,omitempty"`
	DoorNumber string  `json:"door_number"`
	Floor      *int32  `json:"floor,omitempty"`
}

type AssignResidentRequest struct {
	FullName string  `json:"full_name"`
	Phone    string  `json:"phone"`           // Zorunlu alan
	Email    *string `json:"email,omitempty"` // Opsiyonel alan
	Password string  `json:"password"`
}

type RemoveTenantRequest struct {
	DebtAction string  `json:"debt_action"` // 'keep' | 'transfer' | 'delete'
	Notes      *string `json:"notes,omitempty"`
}

type TenantHistoryItem struct {
	ID             string     `json:"id"`
	ApartmentID    string     `json:"apartment_id"`
	TenantUserID   string     `json:"tenant_user_id"`
	TenantFullName string     `json:"tenant_full_name"`
	TenantPhone    string     `json:"tenant_phone"`
	TenantEmail    *string    `json:"tenant_email,omitempty"`
	StartedAt      time.Time  `json:"started_at"`
	EndedAt        *time.Time `json:"ended_at,omitempty"`
	DebtAction     *string    `json:"debt_action,omitempty"`
	Notes          *string    `json:"notes,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}
