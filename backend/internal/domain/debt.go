package domain

import (
	"errors"
	"time"
)

var (
	ErrDebtNotFound = errors.New("borç kaydı bulunamadı")
)

type DebtType string

const (
	DebtTypeMonthlyDue DebtType = "monthly_due"
	DebtTypeFixture    DebtType = "fixture"
	DebtTypeInvestment DebtType = "investment"
	DebtTypeOther      DebtType = "other"
	DebtTypeUtility    DebtType = "utility"
)

type DebtStatus string

const (
	DebtStatusOpen    DebtStatus = "open"
	DebtStatusPartial DebtStatus = "partial"
	DebtStatusPaid    DebtStatus = "paid"
)

type Debt struct {
	ID           string     `json:"id"`
	SiteID       string     `json:"site_id"`
	ApartmentID  string     `json:"apartment_id"`
	DebtorUserID string     `json:"debtor_user_id"`
	Type         DebtType   `json:"type"`
	Amount       float64    `json:"amount"`
	DueMonth     *string    `json:"due_month,omitempty"` // YYYY-MM-DD
	Description  *string    `json:"description,omitempty"`
	Status       DebtStatus `json:"status"`
	CreatedBy    *string    `json:"created_by,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type DebtDetail struct {
	ID             string     `json:"id"`
	SiteID         string     `json:"site_id"`
	ApartmentID    string     `json:"apartment_id"`
	DebtorUserID   string     `json:"debtor_user_id"`
	Type           DebtType   `json:"type"`
	Amount         float64    `json:"amount"`
	DueMonth       *string    `json:"due_month,omitempty"`
	Description    *string    `json:"description,omitempty"`
	Status         DebtStatus `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	PaidAmount     float64    `json:"paid_amount"`
	Remaining      float64    `json:"remaining"`
	DoorNumber     string     `json:"door_number"`
	BlockName      string     `json:"block_name,omitempty"`
	DebtorFullName string     `json:"debtor_full_name"`
	DebtorPhone    string     `json:"debtor_phone"`
}

type DebtStats struct {
	TotalAmount    float64 `json:"total_amount"`
	TotalPaid      float64 `json:"total_paid"`
	TotalRemaining float64 `json:"total_remaining"`
	TotalCount     int     `json:"total_count"`
	OpenCount      int     `json:"open_count"`
	PartialCount   int     `json:"partial_count"`
	PaidCount      int     `json:"paid_count"`
}

type CreateManualDebtRequest struct {
	ApartmentID  string   `json:"apartment_id"`
	DebtorUserID *string  `json:"debtor_user_id,omitempty"` // Opsiyonel: fixture/investment için zorunlu owner, other için seçilebilir
	Type         DebtType `json:"type"`                     // fixture, investment, other
	Amount       float64  `json:"amount"`
	DueMonth     *string  `json:"due_month,omitempty"`      // YYYY-MM-DD
	Description  string   `json:"description"`
}

type DebtFilter struct {
	SiteID       string
	Status       *string
	Type         *string
	ApartmentID  *string
	DebtorUserID *string
}

type AccrueMonthlyDuesResult struct {
	TargetMonth  string  `json:"target_month"`
	CreatedCount int     `json:"created_count"`
	SkippedCount int     `json:"skipped_count"`
	Amount       float64 `json:"amount"`
}

type CreateBulkDebtRequest struct {
	Type         DebtType `json:"type"`                     // fixture, investment, other
	Amount       float64  `json:"amount"`                   // Daire başı tutar
	DueMonth     *string  `json:"due_month,omitempty"`      // YYYY-MM-DD
	Description  string   `json:"description"`              // Açıklama (örn: Dış cephe boyama)
	DebtorTarget *string  `json:"debtor_target,omitempty"`  // "owner" (yalnızca malikler) veya "auto" (kiracı, yoksa malik)
}

type BulkDebtResult struct {
	CreatedCount int      `json:"created_count"`
	SkippedCount int      `json:"skipped_count"`
	TotalAmount  float64  `json:"total_amount"`
	ApartmentIDs []string `json:"apartment_ids"`
}

