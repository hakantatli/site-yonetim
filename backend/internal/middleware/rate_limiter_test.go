package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRateLimiter(t *testing.T) {
	limit := 3
	window := 500 * time.Millisecond
	rl := NewRateLimiter(limit, window)

	handler := rl.Limit(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	}))

	req := httptest.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "192.168.1.100:12345"

	// First 3 requests should pass
	for i := 1; i <= limit; i++ {
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Fatalf("request %d expected status 200, got %d", i, rr.Code)
		}
	}

	// 4th request should be rate limited (429)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusTooManyRequests {
		t.Fatalf("expected status 429 Too Many Requests, got %d", rr.Code)
	}

	// Wait for window to expire
	time.Sleep(window + 50*time.Millisecond)

	// Should pass again after window expires
	rrAfter := httptest.NewRecorder()
	handler.ServeHTTP(rrAfter, req)
	if rrAfter.Code != http.StatusOK {
		t.Fatalf("expected status 200 after window reset, got %d", rrAfter.Code)
	}
}
