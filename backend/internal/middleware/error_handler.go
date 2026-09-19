package middleware

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
)

// APIError represents a standardized API error response
type APIError struct {
	StatusCode int         `json:"-"`
	ErrorMsg   string      `json:"error"`
	Code       string      `json:"code,omitempty"`
	Details    interface{} `json:"details,omitempty"`
}

func (e *APIError) Error() string {
	return e.ErrorMsg
}

// NewAPIError creates a new API error
func NewAPIError(statusCode int, msg string, code string) *APIError {
	return &APIError{
		StatusCode: statusCode,
		ErrorMsg:   msg,
		Code:       code,
	}
}

// JSONRecoverer is a middleware that recovers from panics, logs them with slog, and sends a JSON 500 response
func JSONRecoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rvr := recover(); rvr != nil {
				if rvr == http.ErrAbortHandler {
					panic(rvr)
				}

				stack := string(debug.Stack())
				slog.Error("panic recovered",
					"error", fmt.Sprintf("%v", rvr),
					"method", r.Method,
					"path", r.URL.Path,
					"stack", stack,
				)

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]interface{}{
					"error": "Sunucu tarafında beklenmeyen bir hata oluştu.",
					"code":  "INTERNAL_SERVER_ERROR",
				})
			}
		}()

		next.ServeHTTP(w, r)
	})
}
