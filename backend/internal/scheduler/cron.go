package scheduler

import (
	"context"
	"log/slog"
	"time"

	"github.com/hakantatli/site-yonetim/internal/service"
	"github.com/robfig/cron/v3"
)

type Scheduler struct {
	cron       *cron.Cron
	dueService service.DueService
}

func NewScheduler(dueService service.DueService) *Scheduler {
	c := cron.New(cron.WithLocation(time.Local))
	return &Scheduler{
		cron:       c,
		dueService: dueService,
	}
}

func (s *Scheduler) Start() error {
	// Her ayın 1'inde gece saat 00:00'da tüm siteler için otomatik aidat tahakkuku
	// Cron ifadesi: minute(0) hour(0) day_of_month(1) month(*) day_of_week(*)
	_, err := s.cron.AddFunc("0 0 1 * *", func() {
		slog.Info("cron: executing monthly dues auto-accrual job")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()

		now := time.Now()
		if err := s.dueService.AccrueMonthlyDuesForAllSites(ctx, now); err != nil {
			slog.Error("cron: monthly dues auto-accrual failed", "error", err)
		} else {
			slog.Info("cron: monthly dues auto-accrual finished successfully")
		}
	})
	if err != nil {
		return err
	}

	s.cron.Start()
	slog.Info("cron scheduler started successfully (monthly dues auto-accrual active)")
	return nil
}

func (s *Scheduler) Stop() {
	if s.cron != nil {
		ctx := s.cron.Stop()
		<-ctx.Done()
		slog.Info("cron scheduler stopped gracefully")
	}
}
