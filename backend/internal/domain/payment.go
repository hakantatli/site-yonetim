package domain

import (
	"errors"
	"time"
)

type PaymentMethod string

const (
	PaymentMethodCash     PaymentMethod = "cash"
	PaymentMethodTransfer PaymentMethod = "transfer"
)

var (
	ErrDebtAlreadyPaid         = errors.New("bu borç zaten tamamen ödenmiştir")
	ErrPaymentExceedsRemaining = errors.New("ödeme tutarı kalan borçtan fazla olamaz")
	ErrInvalidPaymentMethod    = errors.New("geçersiz ödeme yöntemi: 'cash' veya 'transfer' olmalıdır")
	ErrPaymentNotFound         = errors.New("ödeme kaydı bulunamadı")
	ErrInvalidPaymentAmount    = errors.New("ödeme tutarı 0'dan büyük olmalıdır")
)

type Payment struct {
	ID            string        `json:"id"`
	DebtID        string        `json:"debt_id"`
	SiteID        string        `json:"site_id"`
	Amount        float64       `json:"amount"`
	PaymentMethod PaymentMethod `json:"payment_method"`
	PaymentDate   string        `json:"payment_date"` // YYYY-MM-DD
	Notes         *string       `json:"notes,omitempty"`
	RecordedBy    string        `json:"recorded_by"`
	CreatedAt     time.Time     `json:"created_at"`
}

type PaymentDetail struct {
	ID              string        `json:"id"`
	DebtID          string        `json:"debt_id"`
	SiteID          string        `json:"site_id"`
	Amount          float64       `json:"amount"`
	PaymentMethod   PaymentMethod `json:"payment_method"`
	PaymentDate     string        `json:"payment_date"` // YYYY-MM-DD
	Notes           *string       `json:"notes,omitempty"`
	RecordedBy      string        `json:"recorded_by"`
	CreatedAt       time.Time     `json:"created_at"`
	RecordedByName  string        `json:"recorded_by_name"`
	DebtType        DebtType      `json:"debt_type"`
	DebtDueMonth    *string       `json:"debt_due_month,omitempty"`
	DebtDescription *string       `json:"debt_description,omitempty"`
	DebtTotalAmount float64       `json:"debt_total_amount"`
	DoorNumber      string        `json:"door_number"`
	BlockName       string        `json:"block_name,omitempty"`
	DebtorFullName  string        `json:"debtor_full_name"`
	DebtorPhone     string        `json:"debtor_phone"`
}

type PaymentStats struct {
	TotalCollected float64 `json:"total_collected"`
	CashTotal      float64 `json:"cash_total"`
	TransferTotal  float64 `json:"transfer_total"`
	TotalCount     int     `json:"total_count"`
}

type RecordPaymentRequest struct {
	DebtID        string        `json:"debt_id"`
	Amount        float64       `json:"amount"`
	PaymentMethod PaymentMethod `json:"payment_method"`
	PaymentDate   *string       `json:"payment_date,omitempty"` // YYYY-MM-DD
	Notes         *string       `json:"notes,omitempty"`
}

type PaymentFilter struct {
	DebtID        *string `json:"debt_id,omitempty"`
	ApartmentID   *string `json:"apartment_id,omitempty"`
	PaymentMethod *string `json:"payment_method,omitempty"`
	StartDate     *string `json:"start_date,omitempty"`
	EndDate       *string `json:"end_date,omitempty"`
	DebtorUserID  *string `json:"debtor_user_id,omitempty"`
}
