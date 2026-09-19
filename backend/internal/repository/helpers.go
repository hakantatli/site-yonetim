package repository

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func StringToUUID(s string) pgtype.UUID {
	parsed, err := uuid.Parse(s)
	if err != nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}
}

func UUIDToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return uuid.UUID(u.Bytes).String()
}

func UUIDToPtrString(u pgtype.UUID) *string {
	if !u.Valid {
		return nil
	}
	str := uuid.UUID(u.Bytes).String()
	return &str
}

func PtrStringToUUID(s *string) pgtype.UUID {
	if s == nil || *s == "" {
		return pgtype.UUID{Valid: false}
	}
	parsed, err := uuid.Parse(*s)
	if err != nil {
		return pgtype.UUID{Valid: false}
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}
}

func TextToPtrString(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func TextToString(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func StringToText(s string) pgtype.Text {
	return pgtype.Text{String: s, Valid: true}
}

func PtrStringToText(s *string) pgtype.Text {
	if s == nil || strings.TrimSpace(*s) == "" {
		return pgtype.Text{Valid: false}
	}
	trimmed := strings.TrimSpace(*s)
	return pgtype.Text{String: trimmed, Valid: true}
}

func NumericToFloat64(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil {
		return 0
	}
	return f.Float64
}

func Float64ToNumeric(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.2f", f))
	return n
}

func Float64ToNumeric3(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.3f", f))
	return n
}

func Float64ToNumeric4(f float64) pgtype.Numeric {
	var n pgtype.Numeric
	_ = n.Scan(fmt.Sprintf("%.4f", f))
	return n
}

func DateToString(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}

func DateToPtrString(d pgtype.Date) *string {
	if !d.Valid {
		return nil
	}
	s := d.Time.Format("2006-01-02")
	return &s
}

func StringToDate(s string) pgtype.Date {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return pgtype.Date{Valid: false}
	}
	return pgtype.Date{Time: t, Valid: true}
}

func PtrStringToDate(s *string) pgtype.Date {
	if s == nil || *s == "" {
		return pgtype.Date{Valid: false}
	}
	return StringToDate(*s)
}

