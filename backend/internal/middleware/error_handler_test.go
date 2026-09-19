package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJSONRecoverer(t *testing.T) {
	panicHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("something went catastrophically wrong")
	})

	recovered := JSONRecoverer(panicHandler)

	req := httptest.NewRequest("GET", "/panic", nil)
	rr := httptest.NewRecorder()

	recovered.ServeHTTP(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode json response: %v", err)
	}

	if resp["code"] != "INTERNAL_SERVER_ERROR" {
		t.Fatalf("expected code INTERNAL_SERVER_ERROR, got %v", resp["code"])
	}
}
