package domain_test

import (
	"testing"

	"github.com/hakantatli/site-yonetim/internal/domain"
)

func TestCleanPhone(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"empty string", "", ""},
		{"already clean 11 digits", "05066588775", "05066588775"},
		{"formatted 0(506) 658 8775", "0(506) 658 8775", "05066588775"},
		{"10 digits starting with 5", "5066588775", "05066588775"},
		{"with dashes and spaces", "0506-658-87-75", "05066588775"},
		{"whitespaces only", "   ", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := domain.CleanPhone(tt.input)
			if got != tt.expected {
				t.Errorf("CleanPhone(%q) = %q; want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestLoginRequest_GetIdentifier(t *testing.T) {
	phoneInput := "0(506) 658 8775"
	reqPhone := domain.LoginRequest{Login: phoneInput}
	if got := reqPhone.GetIdentifier(); got != "05066588775" {
		t.Errorf("expected 05066588775, got %s", got)
	}

	emailInput := "test@example.com"
	reqEmail := domain.LoginRequest{Login: emailInput}
	if got := reqEmail.GetIdentifier(); got != "test@example.com" {
		t.Errorf("expected test@example.com, got %s", got)
	}
}
