package domain

import "time"

type DueRate struct {
	ID            string    `json:"id"`
	SiteID        string    `json:"site_id"`
	Amount        float64   `json:"amount"`
	ValidFrom     string    `json:"valid_from"` // YYYY-MM-DD
	CreatedBy     string    `json:"created_by"`
	CreatedByName string    `json:"created_by_name,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type SetDueRateRequest struct {
	Amount        float64 `json:"amount"`
	EffectiveType string  `json:"effective_type"` // "this_month" | "next_month" | "custom"
	ValidFrom     *string `json:"valid_from,omitempty"`
}

type DueRateSummary struct {
	CurrentRate  *DueRate  `json:"current_rate"`
	UpcomingRate *DueRate  `json:"upcoming_rate,omitempty"`
	History      []DueRate `json:"history"`
}
