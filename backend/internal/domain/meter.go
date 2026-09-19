package domain

import (
	"errors"
	"time"
)

var (
	ErrMeterTypeNotFound         = errors.New("sayaç türü bulunamadı")
	ErrPeriodNotFound            = errors.New("faturalandırma dönemi bulunamadı")
	ErrInvalidBillAmount         = errors.New("fatura tutarı sıfırdan büyük olmalıdır")
	ErrInvalidConsumption        = errors.New("faturadaki ana sayaç tüketimi sıfırdan büyük olmalıdır")
	ErrApartmentsExceedMainMeter = errors.New("dairelerin toplam tüketimi ana sayaç tüketiminden fazla olamaz")
)

type MeterType struct {
	ID        string    `json:"id"`
	SiteID    string    `json:"site_id"`
	Name      string    `json:"name"`
	Unit      string    `json:"unit"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateMeterTypePayload struct {
	Name string `json:"name"`
	Unit string `json:"unit"`
}

type UpdateMeterTypePayload struct {
	Name     string `json:"name"`
	Unit     string `json:"unit"`
	IsActive bool   `json:"is_active"`
}

type ConsumptionPeriod struct {
	ID                         string    `json:"id"`
	SiteID                     string    `json:"site_id"`
	MeterTypeID                string    `json:"meter_type_id"`
	MeterTypeName              string    `json:"meter_type_name"`
	MeterTypeUnit              string    `json:"meter_type_unit"`
	Period                     string    `json:"period"` // YYYY-MM
	MainMeterPrevious          float64   `json:"main_meter_previous"`
	MainMeterCurrent           float64   `json:"main_meter_current"`
	TotalBilledConsumption     float64   `json:"total_billed_consumption"`
	TotalApartmentsConsumption float64   `json:"total_apartments_consumption"`
	CommonAreaConsumption      float64   `json:"common_area_consumption"`
	TotalBillAmount            float64   `json:"total_bill_amount"`
	UnitCost                   float64   `json:"unit_cost"`
	CommonAreaCost             float64   `json:"common_area_cost"`
	BillDate                   *string   `json:"bill_date,omitempty"`
	BillNo                     *string   `json:"bill_no,omitempty"`
	Description                *string   `json:"description,omitempty"`
	ReadingCount               int64     `json:"reading_count"`
	CreatedBy                  *string   `json:"created_by,omitempty"`
	CreatedAt                  time.Time `json:"created_at"`
	UpdatedAt                  time.Time `json:"updated_at"`
}

type MeterReading struct {
	ID                  string    `json:"id"`
	ConsumptionPeriodID string    `json:"consumption_period_id"`
	ApartmentID         string    `json:"apartment_id"`
	DoorNumber          string    `json:"door_number"`
	BlockName           *string   `json:"block_name,omitempty"`
	DebtorUserID        *string   `json:"debtor_user_id,omitempty"`
	DebtorFullName      *string   `json:"debtor_full_name,omitempty"`
	DebtorPhone         *string   `json:"debtor_phone,omitempty"`
	PreviousReading     float64   `json:"previous_reading"`
	CurrentReading      float64   `json:"current_reading"`
	Consumption         float64   `json:"consumption"`
	IndividualAmount    float64   `json:"individual_amount"`
	CommonAreaAmount    float64   `json:"common_area_amount"`
	TotalAmount         float64   `json:"total_amount"`
	DebtID              *string   `json:"debt_id,omitempty"`
	DebtStatus          *string   `json:"debt_status,omitempty"`
	ReadingDate         string    `json:"reading_date"`
	Notes               *string   `json:"notes,omitempty"`
	CreatedAt           time.Time `json:"created_at"`
}

type ApartmentLastReading struct {
	ApartmentID string  `json:"apartment_id"`
	DoorNumber  string  `json:"door_number"`
	BlockName   *string `json:"block_name,omitempty"`
	LastReading float64 `json:"last_reading"`
}

type PreviousReadingsResponse struct {
	MainMeterPrevious float64                `json:"main_meter_previous"`
	Apartments        []ApartmentLastReading `json:"apartments"`
}

type ReadingInput struct {
	ApartmentID     string  `json:"apartment_id"`
	PreviousReading float64 `json:"previous_reading"`
	CurrentReading  float64 `json:"current_reading"`
	Notes           *string `json:"notes,omitempty"`
}

type CreateConsumptionPeriodPayload struct {
	MeterTypeID       string         `json:"meter_type_id"`
	Period            string         `json:"period"` // e.g. "2026-09"
	MainMeterPrevious float64        `json:"main_meter_previous"`
	MainMeterCurrent  float64        `json:"main_meter_current"`
	TotalBillAmount   float64        `json:"total_bill_amount"`
	BillDate          *string        `json:"bill_date,omitempty"`
	BillNo            *string        `json:"bill_no,omitempty"`
	Description       *string        `json:"description,omitempty"`
	Readings          []ReadingInput `json:"readings"`
}

type ResidentMeterHistoryItem struct {
	ReadingID              string  `json:"reading_id"`
	ReadingDate            string  `json:"reading_date"`
	PreviousReading        float64 `json:"previous_reading"`
	CurrentReading         float64 `json:"current_reading"`
	Consumption            float64 `json:"consumption"`
	IndividualAmount       float64 `json:"individual_amount"`
	CommonAreaAmount       float64 `json:"common_area_amount"`
	TotalAmount            float64 `json:"total_amount"`
	DebtID                 *string `json:"debt_id,omitempty"`
	DebtStatus             *string `json:"debt_status,omitempty"`
	Period                 string  `json:"period"`
	BillDate               *string `json:"bill_date,omitempty"`
	BillNo                 *string `json:"bill_no,omitempty"`
	TotalBillAmount        float64 `json:"total_bill_amount"`
	UnitCost               float64 `json:"unit_cost"`
	TotalBilledConsumption float64 `json:"total_billed_consumption"`
	CommonAreaConsumption  float64 `json:"common_area_consumption"`
	MeterTypeName          string  `json:"meter_type_name"`
	MeterTypeUnit          string  `json:"meter_type_unit"`
}
