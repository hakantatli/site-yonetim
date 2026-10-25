package domain

import "time"

type ExpenseCategory struct {
	ID        string    `json:"id"`
	SiteID    string    `json:"site_id"`
	Name      string    `json:"name"`
	IsDefault bool      `json:"is_default"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateCategoryRequest struct {
	Name string `json:"name"`
}

type UpdateCategoryRequest struct {
	Name     string `json:"name"`
	IsActive *bool  `json:"is_active,omitempty"`
}

type Expense struct {
	ID              string    `json:"id"`
	SiteID          string    `json:"site_id"`
	CategoryID      string    `json:"category_id"`
	CategoryName    string    `json:"category_name"`
	Amount          float64   `json:"amount"`
	Description     *string   `json:"description,omitempty"`
	ExpenseDate     string    `json:"expense_date"`
	ReceiptNote     *string   `json:"receipt_note,omitempty"`
	RecordedBy      string    `json:"recorded_by"`
	RecordedByName  string    `json:"recorded_by_name"`
	InvoiceID       *string   `json:"invoice_id,omitempty"`
	InvoiceFileName *string   `json:"invoice_file_name,omitempty"`
	InvoiceFileSize *int      `json:"invoice_file_size,omitempty"`
	InvoiceFileType *string   `json:"invoice_file_type,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type ExpenseInvoice struct {
	ID        string    `json:"id"`
	ExpenseID string    `json:"expense_id"`
	FileName  string    `json:"file_name"`
	FileType  string    `json:"file_type"`
	FileSize  int       `json:"file_size"`
	FileData  []byte    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateExpenseRequest struct {
	CategoryID      string  `json:"category_id"`
	Amount          float64 `json:"amount"`
	Description     *string `json:"description,omitempty"`
	ExpenseDate     string  `json:"expense_date"`
	ReceiptNote     *string `json:"receipt_note,omitempty"`
	InvoiceFileName *string `json:"invoice_file_name,omitempty"`
	InvoiceFileType *string `json:"invoice_file_type,omitempty"`
	InvoiceFileData []byte  `json:"-"`
}

type ExpenseFilter struct {
	CategoryID *string `json:"category_id,omitempty"`
	StartDate  *string `json:"start_date,omitempty"`
	EndDate    *string `json:"end_date,omitempty"`
}

type ExpenseStats struct {
	TotalAmount     float64 `json:"total_amount"`
	ThisMonthAmount float64 `json:"this_month_amount"`
	TotalCount      int64   `json:"total_count"`
}

type CategoryBreakdownItem struct {
	CategoryID   string  `json:"category_id"`
	CategoryName string  `json:"category_name"`
	TotalAmount  float64 `json:"total_amount"`
	ExpenseCount int64   `json:"expense_count"`
	Percentage   float64 `json:"percentage"`
}

type MonthlyFlowItem struct {
	Month   string  `json:"month"` // YYYY-MM
	Income  float64 `json:"income"`
	Expense float64 `json:"expense"`
	Net     float64 `json:"net"`
}

type TreasurySummary struct {
	InitialBalance    float64                 `json:"initial_balance"`
	TotalIncome       float64                 `json:"total_income"`
	TotalExpense      float64                 `json:"total_expense"`
	NetBalance        float64                 `json:"net_balance"`
	ThisMonthIncome   float64                 `json:"this_month_income"`
	ThisMonthExpense  float64                 `json:"this_month_expense"`
	ThisMonthNet      float64                 `json:"this_month_net"`
	CategoryBreakdown []CategoryBreakdownItem `json:"category_breakdown"`
	MonthlyFlow       []MonthlyFlowItem       `json:"monthly_flow"`
}

type UpdateInitialBalanceRequest struct {
	InitialBalance float64 `json:"initial_balance"`
}

