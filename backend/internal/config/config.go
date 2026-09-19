package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	JWTSecret            string
	JWTAccessTTL         time.Duration
	JWTRefreshTTL        time.Duration
	AllowedOrigins       []string
	InitialOwnerPhone    string
	InitialOwnerEmail    string
	InitialOwnerPassword string
}

func Load() *Config {
	_ = godotenv.Load("../../.env")
	_ = godotenv.Load(".env")

	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "postgres://site_user:site_pass@localhost:5432/site_yonetim?sslmode=disable")
	jwtSecret := getEnv("JWT_SECRET", "dev-secret-change-in-production")

	accessMinutes, err := strconv.Atoi(getEnv("JWT_ACCESS_TTL_MINUTES", "15"))
	if err != nil || accessMinutes <= 0 {
		accessMinutes = 15
	}

	refreshDays, err := strconv.Atoi(getEnv("JWT_REFRESH_TTL_DAYS", "7"))
	if err != nil || refreshDays <= 0 {
		refreshDays = 7
	}

	allowedOriginsStr := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000")
	var origins []string
	for _, o := range strings.Split(allowedOriginsStr, ",") {
		trimmed := strings.TrimSpace(o)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	initialOwnerPhone := getEnv("INITIAL_OWNER_PHONE", "05000000000")
	initialOwnerEmail := getEnv("INITIAL_OWNER_EMAIL", "admin@siteyonetim.local")
	initialOwnerPassword := getEnv("INITIAL_OWNER_PASSWORD", "")

	return &Config{
		Port:                 port,
		DatabaseURL:          dbURL,
		JWTSecret:            jwtSecret,
		JWTAccessTTL:         time.Duration(accessMinutes) * time.Minute,
		JWTRefreshTTL:        time.Duration(refreshDays) * 24 * time.Hour,
		AllowedOrigins:       origins,
		InitialOwnerPhone:    initialOwnerPhone,
		InitialOwnerEmail:    initialOwnerEmail,
		InitialOwnerPassword: initialOwnerPassword,
	}
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}
