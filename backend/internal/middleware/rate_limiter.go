package middleware

import (
	"encoding/json"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

type clientRecord struct {
	count     int
	expiresAt time.Time
}

type RateLimiter struct {
	mu      sync.RWMutex
	records map[string]*clientRecord
	limit   int
	window  time.Duration
}

// NewRateLimiter creates an in-memory IP-based rate limiter
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		records: make(map[string]*clientRecord),
		limit:   limit,
		window:  window,
	}

	// Periodic cleanup goroutine every 5 minutes
	go rl.cleanup(5 * time.Minute)

	return rl
}

func (rl *RateLimiter) cleanup(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for ip, rec := range rl.records {
			if now.After(rec.expiresAt) {
				delete(rl.records, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Limit returns a middleware handler
func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getClientIP(r)

		rl.mu.Lock()
		now := time.Now()
		rec, exists := rl.records[ip]

		if !exists || now.After(rec.expiresAt) {
			rec = &clientRecord{
				count:     1,
				expiresAt: now.Add(rl.window),
			}
			rl.records[ip] = rec
		} else {
			rec.count++
		}

		currentCount := rec.count
		remaining := rl.limit - currentCount
		if remaining < 0 {
			remaining = 0
		}
		retryAfter := int(time.Until(rec.expiresAt).Seconds())
		if retryAfter < 1 {
			retryAfter = 1
		}
		rl.mu.Unlock()

		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(rl.limit))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))

		if currentCount > rl.limit {
			w.Header().Set("Retry-After", strconv.Itoa(retryAfter))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"error": "Çok fazla istek yapıldı. Lütfen bir süre sonra tekrar deneyin.",
				"code":  "RATE_LIMIT_EXCEEDED",
			})
			return
		}

		next.ServeHTTP(w, r)
	})
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}

	// Check X-Real-IP
	if xrip := r.Header.Get("X-Real-IP"); xrip != "" {
		return strings.TrimSpace(xrip)
	}

	// Fallback to RemoteAddr
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}
