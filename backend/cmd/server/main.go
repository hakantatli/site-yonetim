package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/hakantatli/site-yonetim/internal/config"
	"github.com/hakantatli/site-yonetim/internal/domain"
	"github.com/hakantatli/site-yonetim/internal/handler"
	"github.com/hakantatli/site-yonetim/internal/middleware"
	"github.com/hakantatli/site-yonetim/internal/repository"
	"github.com/hakantatli/site-yonetim/internal/scheduler"
	"github.com/hakantatli/site-yonetim/internal/service"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to parse database config", "error", err)
		os.Exit(1)
	}

	dbPool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		slog.Warn("database ping failed, continuing anyway", "error", err)
	} else {
		slog.Info("connected to database successfully")
		if _, err := dbPool.Exec(ctx, "ALTER TABLE apartments ADD COLUMN IF NOT EXISTS is_due_exempt BOOLEAN NOT NULL DEFAULT FALSE;"); err != nil {
			slog.Warn("could not ensure is_due_exempt column", "error", err)
		}
		if _, err := dbPool.Exec(ctx, `
			UPDATE debts d
			SET debtor_user_id = a.owner_user_id, updated_at = NOW()
			FROM apartments a, users u_debtor
			WHERE d.apartment_id = a.id
			  AND d.debtor_user_id = u_debtor.id
			  AND u_debtor.full_name LIKE 'Sistem Sahibi%'
			  AND a.tenant_user_id IS NULL
			  AND a.owner_user_id IS NOT NULL
			  AND a.owner_user_id <> d.debtor_user_id;
		`); err != nil {
			slog.Warn("could not sync owner debts", "error", err)
		}
		if _, err := dbPool.Exec(ctx, "UPDATE users SET full_name = 'Hakan Tatlı', updated_at = NOW() WHERE full_name LIKE 'Sistem Sahibi%';"); err != nil {
			slog.Warn("could not update default owner full_name", "error", err)
		}
		if _, err := dbPool.Exec(ctx, `
			UPDATE payments p
			SET notes = CASE
				WHEN p.notes IS NULL OR btrim(p.notes) = '' THEN '[Eksik Ödeme: ₺' || to_char(d.amount - p.amount, 'FM999999990.00') || ']'
				ELSE '[Eksik Ödeme: ₺' || to_char(d.amount - p.amount, 'FM999999990.00') || '] ' || p.notes
			END
			FROM debts d
			WHERE p.debt_id = d.id
			  AND p.amount < d.amount
			  AND (p.notes IS NULL OR p.notes NOT LIKE '%Eksik Ödeme%')
			  AND (SELECT COUNT(*) FROM payments p2 WHERE p2.debt_id = d.id) = 1;
		`); err != nil {
			slog.Warn("could not backfill shortfall payment notes", "error", err)
		}
	}

	// Repositories
	userRepo := repository.NewUserRepository(dbPool)
	tokenRepo := repository.NewTokenRepository(dbPool)
	siteRepo := repository.NewSiteRepository(dbPool)
	apartmentRepo := repository.NewApartmentRepository(dbPool)
	dueRepo := repository.NewDueRepository(dbPool)
	debtRepo := repository.NewDebtRepository(dbPool)
	paymentRepo := repository.NewPaymentRepository(dbPool)
	expenseRepo := repository.NewExpenseRepository(dbPool)
	meterRepo := repository.NewMeterRepository(dbPool)
	announcementRepo := repository.NewAnnouncementRepository(dbPool)

	// Services
	authService := service.NewAuthService(cfg, userRepo, tokenRepo)
	siteService := service.NewSiteService(siteRepo, userRepo)
	apartmentService := service.NewApartmentService(apartmentRepo, siteRepo, userRepo)
	dueService := service.NewDueService(dueRepo, debtRepo, apartmentRepo, siteRepo)
	paymentService := service.NewPaymentService(paymentRepo, debtRepo)
	expenseService := service.NewExpenseService(expenseRepo)
	meterService := service.NewMeterService(meterRepo, apartmentRepo, debtRepo)
	announcementService := service.NewAnnouncementService(announcementRepo)

	// Cron Scheduler (Auto Monthly Dues Accrual)
	cronScheduler := scheduler.NewScheduler(dueService)
	if err := cronScheduler.Start(); err != nil {
		slog.Error("failed to start cron scheduler", "error", err)
	} else {
		defer cronScheduler.Stop()
	}

	// Seed Owner user if none exists
	var ownerEmail *string
	if cfg.InitialOwnerEmail != "" {
		ownerEmail = &cfg.InitialOwnerEmail
	}
	ownerPassword := cfg.InitialOwnerPassword
	if ownerPassword == "" {
		randBytes := make([]byte, 8)
		if _, err := rand.Read(randBytes); err == nil {
			ownerPassword = hex.EncodeToString(randBytes) // 16 hex chars
			slog.Warn("⚠️  INITIAL_OWNER_PASSWORD is not set in .env! Generated random secure owner password", "phone", cfg.InitialOwnerPhone, "temporary_password", ownerPassword)
		} else {
			ownerPassword = "AdminPassword123!"
		}
	}
	err = authService.SeedOwnerIfEmpty(ctx, cfg.InitialOwnerPhone, ownerEmail, ownerPassword, "Hakan Tatlı")
	if err != nil {
		slog.Warn("could not seed owner user", "error", err)
	} else {
		slog.Info("owner seed verified")
	}

	// Handlers
	loginLimiter := middleware.NewRateLimiter(10, 1*time.Minute)
	authHandler := handler.NewAuthHandler(authService, loginLimiter)
	ownerHandler := handler.NewOwnerHandler(siteService)
	adminHandler := handler.NewAdminHandler(apartmentService, dueService, paymentService, expenseService, meterService, announcementService)
	residentHandler := handler.NewResidentHandler(apartmentService, expenseService, meterService, announcementService, dueService, paymentService)

	r := chi.NewRouter()

	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Logger)
	r.Use(middleware.JSONRecoverer)
	r.Use(chiMiddleware.Timeout(60 * time.Second))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link", "X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status": "ok",
			"time":   time.Now().UTC().Format(time.RFC3339),
		})
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{
				"status":  "ok",
				"version": "v1",
				"time":    time.Now().UTC().Format(time.RFC3339),
			})
		})

		// Auth endpoints
		r.Mount("/auth", authHandler.Routes())

		// Owner endpoints (Protected: RoleOwner only)
		r.Group(func(owner chi.Router) {
			owner.Use(middleware.AuthMiddleware(authService))
			owner.Use(middleware.RequireRole(domain.RoleOwner))
			owner.Mount("/owner", ownerHandler.Routes())
		})

		// Admin endpoints (Protected: RoleAdmin or RoleOwner)
		r.Group(func(admin chi.Router) {
			admin.Use(middleware.AuthMiddleware(authService))
			admin.Use(middleware.RequireRole(domain.RoleAdmin, domain.RoleOwner))
			admin.Mount("/admin", adminHandler.Routes())
		})

		// Resident endpoints (Protected: RoleResident, RoleAdmin, RoleOwner)
		r.Group(func(resident chi.Router) {
			resident.Use(middleware.AuthMiddleware(authService))
			resident.Use(middleware.RequireRole(domain.RoleResident, domain.RoleAdmin, domain.RoleOwner))
			resident.Mount("/resident", residentHandler.Routes())
		})

		// Site specific scoped endpoints with SiteIsolationMiddleware
		r.Group(func(siteScoped chi.Router) {
			siteScoped.Use(middleware.AuthMiddleware(authService))

			siteScoped.Route("/sites/{siteID}", func(site chi.Router) {
				site.Use(middleware.SiteIsolationMiddleware())

				site.Get("/ping", func(w http.ResponseWriter, r *http.Request) {
					w.Header().Set("Content-Type", "application/json")
					_ = json.NewEncoder(w).Encode(map[string]string{
						"message": fmt.Sprintf("pong site %s", chi.URLParam(r, "siteID")),
					})
				})

				// Also mount admin routes under /sites/{siteID}/admin
				site.Mount("/admin", adminHandler.Routes())
			})
		})
	})

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		slog.Info(fmt.Sprintf("server starting on port %s", cfg.Port))
		serverErrors <- srv.ListenAndServe()
	}()

	select {
	case err := <-serverErrors:
		if err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	case <-ctx.Done():
		slog.Info("shutting down server gracefully...")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			slog.Error("server forced to shutdown", "error", err)
			_ = srv.Close()
		}
		slog.Info("server exited cleanly")
	}
}
