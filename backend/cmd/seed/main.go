package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/hakantatli/site-yonetim/internal/config"
	"github.com/hakantatli/site-yonetim/internal/seed"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()
	ctx := context.Background()

	poolConfig, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		slog.Error("Veritabanı konfigürasyonu okunamadı", "error", err)
		os.Exit(1)
	}

	db, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		slog.Error("Veritabanına bağlanılamadı", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	if err := db.Ping(ctx); err != nil {
		slog.Error("Veritabanı ping başarısız", "error", err)
		os.Exit(1)
	}

	if err := seed.ForceSeedDemoData(ctx, db); err != nil {
		slog.Error("Demo seed başarısız", "error", err)
		os.Exit(1)
	}

	fmt.Println("\n=======================================================")
	fmt.Println("DEMO VERİLERİ BAŞARIYLA OLUŞTURULDU!")
	fmt.Println("=======================================================")
	fmt.Println("Site Adı       : Çınar Park Sitesi (Kadıköy / İstanbul)")
	fmt.Println("Daire Sayısı   : 10 Daire (A Blok: 1-5, B Blok: 6-10)")
	fmt.Println("Kasa Devri     : ₺24,500.00")
	fmt.Println("Aidat Geçmişi  : Temmuz, Ağustos, Eylül, Ekim 2026")
	fmt.Println("Sayaç Dağıtımı : Eylül 2026 Elektrik Faturası (3.000 kWh / ₺9.000)")
	fmt.Println("-------------------------------------------------------")
	fmt.Println("YÖNETİCİ GİRİŞİ:")
	fmt.Println("  Telefon : 0555 123 45 67 (veya 05551234567)")
	fmt.Println("  E-posta : yonetici@cinarpark.com")
	fmt.Println("  Şifre   : Demo1234!")
	fmt.Println("-------------------------------------------------------")
	fmt.Println("SAKİN (KİRACI) GİRİŞİ (A Blok No: 2):")
	fmt.Println("  İsim    : Can Arslan")
	fmt.Println("  Telefon : 0542 301 00 01 (veya 05423010001)")
	fmt.Println("  Şifre   : Demo1234!")
	fmt.Println("=======================================================")
}
