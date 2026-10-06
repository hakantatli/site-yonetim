package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/google/uuid"
	"github.com/hakantatli/site-yonetim/internal/config"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
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

	slog.Info("Veritabanına bağlanıldı, demo seed işlemi başlatılıyor...")

	// 1. Şifre hash'i (Tüm demo kullanıcılar için Demo1234!)
	demoPasswordHash, err := bcrypt.GenerateFromPassword([]byte("Demo1234!"), bcrypt.DefaultCost)
	if err != nil {
		slog.Error("Şifre hash oluşturulamadı", "error", err)
		os.Exit(1)
	}
	hashStr := string(demoPasswordHash)

	// 2. Varsa eski demo sitesini ve kullanıcılarını temizle
	demoPhones := []string{
		"05551234567", // Yönetici (Ahmet Yılmaz)
		"05423010001", "05423010002", "05423010003", "05423010004", "05423010005", // Kiracılar
		"05321010001", "05321010002", "05321010003", "05321010004", "05321010005", // Ev Sahipleri
		"05321010006", "05321010007", "05321010008", "05321010009",
	}

	for _, phone := range demoPhones {
		_, _ = db.Exec(ctx, "DELETE FROM users WHERE phone = $1", phone)
	}
	_, _ = db.Exec(ctx, "DELETE FROM sites WHERE name = 'Çınar Park Sitesi'")

	// 3. Demo Site Oluştur
	siteID := uuid.New().String()
	_, err = db.Exec(ctx, `
		INSERT INTO sites (id, name, address, apartment_limit, initial_balance, created_at, updated_at)
		VALUES ($1, 'Çınar Park Sitesi', 'Atatürk Mahallesi, Orkide Sokak No: 15, Kadıköy / İstanbul', 10, 24500.00, NOW() - INTERVAL '4 months', NOW())
	`, siteID)
	if err != nil {
		slog.Error("Site oluşturulamadı", "error", err)
		os.Exit(1)
	}
	slog.Info("Demo site oluşturuldu", "site_id", siteID, "name", "Çınar Park Sitesi")

	// 4. Demo Site Yöneticisi (Admin) Oluştur
	adminID := uuid.New().String()
	_, err = db.Exec(ctx, `
		INSERT INTO users (id, site_id, full_name, phone, email, password_hash, role, is_active, must_change_password, created_at, updated_at)
		VALUES ($1, $2, 'Ahmet Yılmaz (Yönetici)', '05551234567', 'yonetici@cinarpark.com', $3, 'admin', true, false, NOW() - INTERVAL '4 months', NOW())
	`, adminID, siteID, hashStr)
	if err != nil {
		slog.Error("Yönetici oluşturulamadı", "error", err)
		os.Exit(1)
	}
	slog.Info("Demo yönetici oluşturuldu", "phone", "05551234567", "email", "yonetici@cinarpark.com")

	// 5. Blokları Oluştur (A Blok ve B Blok)
	blockAID := uuid.New().String()
	blockBID := uuid.New().String()
	_, err = db.Exec(ctx, `INSERT INTO blocks (id, site_id, name) VALUES ($1, $2, 'A Blok'), ($3, $2, 'B Blok')`, blockAID, siteID, blockBID)
	if err != nil {
		slog.Error("Bloklar oluşturulamadı", "error", err)
		os.Exit(1)
	}

	// 6. Masraf Kategorilerini Oluştur
	categories := []struct {
		ID   string
		Name string
	}{
		{uuid.New().String(), "Elektrik/Su"},
		{uuid.New().String(), "Temizlik"},
		{uuid.New().String(), "Asansör Bakımı"},
		{uuid.New().String(), "Personel/Görevli"},
		{uuid.New().String(), "Demirbaş/Onarım"},
		{uuid.New().String(), "Genel Giderler"},
		{uuid.New().String(), "Bahçe Bakımı"},
	}
	categoryMap := make(map[string]string)
	for _, cat := range categories {
		_, err = db.Exec(ctx, `
			INSERT INTO expense_categories (id, site_id, name, is_default, is_active)
			VALUES ($1, $2, $3, true, true)
		`, cat.ID, siteID, cat.Name)
		if err != nil {
			slog.Error("Masraf kategorisi oluşturulamadı", "name", cat.Name, "error", err)
		}
		categoryMap[cat.Name] = cat.ID
	}

	// 7. Sayaç Türlerini Oluştur (Su, Doğal Gaz, Elektrik)
	meterTypes := []struct {
		ID   string
		Name string
		Unit string
	}{
		{uuid.New().String(), "Elektrik", "kWh"},
		{uuid.New().String(), "Su", "m³"},
		{uuid.New().String(), "Doğal Gaz", "m³"},
	}
	var elektrikMeterTypeID string
	for _, mt := range meterTypes {
		_, err = db.Exec(ctx, `
			INSERT INTO meter_types (id, site_id, name, unit, is_active)
			VALUES ($1, $2, $3, $4, true)
			ON CONFLICT (site_id, name) DO NOTHING
		`, mt.ID, siteID, mt.Name, mt.Unit)
		if mt.Name == "Elektrik" {
			elektrikMeterTypeID = mt.ID
		}
	}

	// 8. 10 Daire Sakinlerini Oluştur
	type DemoApartment struct {
		ID          string
		BlockID     string
		BlockName   string
		DoorNumber  string
		Floor       int
		IsDueExempt bool
		OwnerName   string
		OwnerPhone  string
		OwnerID     string
		TenantName  string
		TenantPhone string
		TenantID    *string
	}

	demoApts := []DemoApartment{
		// A Blok
		{uuid.New().String(), blockAID, "A Blok", "1", 1, true, "Ahmet Yılmaz (Yönetici)", "05551234567", adminID, "", "", nil},
		{uuid.New().String(), blockAID, "A Blok", "2", 1, false, "Kemal Sunal", "05321010001", uuid.New().String(), "Can Arslan", "05423010001", ptrStr(uuid.New().String())},
		{uuid.New().String(), blockAID, "A Blok", "3", 2, false, "Ayşe Çelik", "05321010002", uuid.New().String(), "", "", nil},
		{uuid.New().String(), blockAID, "A Blok", "4", 2, false, "Mustafa Şahin", "05321010003", uuid.New().String(), "Deniz Yıldırım", "05423010002", ptrStr(uuid.New().String())},
		{uuid.New().String(), blockAID, "A Blok", "5", 3, false, "Fatma Koç", "05321010004", uuid.New().String(), "", "", nil},
		// B Blok
		{uuid.New().String(), blockBID, "B Blok", "6", 1, false, "Ali Demir", "05321010005", uuid.New().String(), "Emre Aydın", "05423010003", ptrStr(uuid.New().String())},
		{uuid.New().String(), blockBID, "B Blok", "7", 1, false, "Zeynep Öztürk", "05321010006", uuid.New().String(), "", "", nil},
		{uuid.New().String(), blockBID, "B Blok", "8", 2, false, "Burak Yıldız", "05321010007", uuid.New().String(), "Selin Güneş", "05423010004", ptrStr(uuid.New().String())},
		{uuid.New().String(), blockBID, "B Blok", "9", 2, false, "Hülya Keskin", "05321010008", uuid.New().String(), "", "", nil},
		{uuid.New().String(), blockBID, "B Blok", "10", 3, false, "Serkan Doğan", "05321010009", uuid.New().String(), "Gizem Aksoy", "05423010005", ptrStr(uuid.New().String())},
	}

	for _, apt := range demoApts {
		// Ev Sahibi kullanıcısını ekle (Eğer yönetici değilse)
		if apt.OwnerID != adminID {
			_, err = db.Exec(ctx, `
				INSERT INTO users (id, site_id, full_name, phone, password_hash, role, is_active, must_change_password, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, 'resident', true, false, NOW() - INTERVAL '4 months', NOW())
			`, apt.OwnerID, siteID, apt.OwnerName, apt.OwnerPhone, hashStr)
			if err != nil {
				slog.Error("Ev sahibi oluşturulamadı", "name", apt.OwnerName, "error", err)
			}
		}

		// Kiracı kullanıcısını ekle (Varsa)
		if apt.TenantID != nil {
			_, err = db.Exec(ctx, `
				INSERT INTO users (id, site_id, full_name, phone, password_hash, role, is_active, must_change_password, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, 'resident', true, false, NOW() - INTERVAL '4 months', NOW())
			`, *apt.TenantID, siteID, apt.TenantName, apt.TenantPhone, hashStr)
			if err != nil {
				slog.Error("Kiracı oluşturulamadı", "name", apt.TenantName, "error", err)
			}
		}

		// Daireyi ekle
		_, err = db.Exec(ctx, `
			INSERT INTO apartments (id, site_id, block_id, door_number, floor, owner_user_id, tenant_user_id, is_active, is_due_exempt, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW() - INTERVAL '4 months', NOW())
		`, apt.ID, siteID, apt.BlockID, apt.DoorNumber, apt.Floor, apt.OwnerID, apt.TenantID, apt.IsDueExempt)
		if err != nil {
			slog.Error("Daire oluşturulamadı", "door", apt.DoorNumber, "error", err)
		}
	}
	slog.Info("10 daire ve sakinleri başarıyla oluşturuldu")

	// 9. Aidat Oranları (Due Rates)
	// Haziran 2026'dan itibaren 1,250 TL, Ağustos 2026'dan itibaren 1,500 TL
	_, err = db.Exec(ctx, `
		INSERT INTO due_rates (id, site_id, amount, valid_from, created_by, created_at)
		VALUES 
			(gen_random_uuid(), $1, 1250.00, '2026-06-01', $2, '2026-05-25 10:00:00+03'),
			(gen_random_uuid(), $1, 1500.00, '2026-08-01', $2, '2026-07-28 14:30:00+03')
	`, siteID, adminID)
	if err != nil {
		slog.Error("Aidat oranları eklenemedi", "error", err)
	}

	// 10. Aidat Tahakkukları ve Ödemeleri (Temmuz, Ağustos, Eylül, Ekim 2026)
	type MonthlyAccrual struct {
		MonthDate   string // "2026-07-01"
		MonthLabel  string // "Temmuz 2026"
		RateAmount  float64
		PaymentDate string // "2026-07-05"
	}

	accruals := []MonthlyAccrual{
		{"2026-07-01", "Temmuz 2026", 1250.00, "2026-07-06"},
		{"2026-08-01", "Ağustos 2026", 1500.00, "2026-08-05"},
		{"2026-09-01", "Eylül 2026", 1500.00, "2026-09-07"},
		{"2026-10-01", "Ekim 2026", 1500.00, "2026-10-03"},
	}

	for _, acc := range accruals {
		for _, apt := range demoApts {
			// Muaf daireye aidat tahakkuk etmez
			if apt.IsDueExempt {
				continue
			}

			// Muhatap: Kiracı varsa kiracı, yoksa ev sahibi
			debtorID := apt.OwnerID
			if apt.TenantID != nil {
				debtorID = *apt.TenantID
			}

			debtID := uuid.New().String()
			desc := fmt.Sprintf("%s Aidat Borcu", acc.MonthLabel)

			// Ay durumlarına göre ödeme senaryosu:
			var debtStatus string
			var paidAmount float64
			var hasPayment bool
			var paymentNotes string

			switch acc.MonthDate {
			case "2026-07-01":
				// Temmuz: Tüm daireler eksiksiz ödedi
				debtStatus = "paid"
				paidAmount = acc.RateAmount
				hasPayment = true
				paymentNotes = fmt.Sprintf("%s Aidat Ödemesi", acc.MonthLabel)

			case "2026-08-01":
				// Ağustos: Daire 4 kısmi ödedi (1000 TL), diğerleri tam ödedi
				if apt.DoorNumber == "4" {
					debtStatus = "partial"
					paidAmount = 1000.00
					hasPayment = true
					paymentNotes = "[Eksik Ödeme: ₺500.00] Havale ile kısmi ödeme yapıldı"
				} else {
					debtStatus = "paid"
					paidAmount = acc.RateAmount
					hasPayment = true
					paymentNotes = fmt.Sprintf("%s Aidat Ödemesi", acc.MonthLabel)
				}

			case "2026-09-01":
				// Eylül: Daire 8 ve Daire 10 hariç hepsi ödedi
				if apt.DoorNumber == "8" || apt.DoorNumber == "10" {
					debtStatus = "open"
					hasPayment = false
				} else {
					debtStatus = "paid"
					paidAmount = acc.RateAmount
					hasPayment = true
					paymentNotes = fmt.Sprintf("%s Aidat Ödemesi", acc.MonthLabel)
				}

			case "2026-10-01":
				// Ekim (güncel ay): Daire 2, 3, 5, 7 erken ödedi; diğerleri açık
				if apt.DoorNumber == "2" || apt.DoorNumber == "3" || apt.DoorNumber == "5" || apt.DoorNumber == "7" {
					debtStatus = "paid"
					paidAmount = acc.RateAmount
					hasPayment = true
					paymentNotes = fmt.Sprintf("%s Aidat Ödemesi (Erken Ödeme)", acc.MonthLabel)
				} else {
					debtStatus = "open"
					hasPayment = false
				}
			}

			// Borcu ekle
			_, err = db.Exec(ctx, `
				INSERT INTO debts (id, site_id, apartment_id, debtor_user_id, type, amount, due_month, description, status, created_by, created_at, updated_at)
				VALUES ($1, $2, $3, $4, 'monthly_due', $5, $6, $7, $8, $9, $6::date + time '00:05:00', NOW())
			`, debtID, siteID, apt.ID, debtorID, acc.RateAmount, acc.MonthDate, desc, debtStatus, adminID)
			if err != nil {
				slog.Error("Aidat borcu eklenemedi", "apt", apt.DoorNumber, "month", acc.MonthDate, "error", err)
				continue
			}

			// Ödeme kaydını ekle
			if hasPayment {
				paymentID := uuid.New().String()
				_, err = db.Exec(ctx, `
					INSERT INTO payments (id, debt_id, site_id, amount, payment_method, payment_date, notes, recorded_by, created_at)
					VALUES ($1, $2, $3, $4, 'transfer', $5, $6, $7, $5::date + time '11:30:00')
				`, paymentID, debtID, siteID, paidAmount, acc.PaymentDate, paymentNotes, adminID)
				if err != nil {
					slog.Error("Ödeme kaydı eklenemedi", "debt_id", debtID, "error", err)
				}
			}
		}
	}
	slog.Info("Temmuz, Ağustos, Eylül ve Ekim 2026 aidat tahakkukları ve ödemeleri işlendi")

	// 11. Masraflar (Expenses)
	type DemoExpense struct {
		CategoryName string
		Amount       float64
		Description  string
		ExpenseDate  string
		ReceiptNote  string
	}

	demoExpenses := []DemoExpense{
		{"Asansör Bakımı", 2200.00, "Schindler Aylık Periyodik Asansör Bakımı", "2026-07-10", "FAT-2026-7012"},
		{"Temizlik", 1850.00, "Ortak Alan Temizlik Malzemeleri ve Sarf Alımı", "2026-07-15", "FS-8819"},
		{"Bahçe Bakımı", 1200.00, "Site Bahçesi Çim Biçme ve Ağaç İlaçlama", "2026-07-22", "FİŞ-104"},
		{"Asansör Bakımı", 2200.00, "Schindler Aylık Periyodik Asansör Bakımı", "2026-08-10", "FAT-2026-8094"},
		{"Temizlik", 1950.00, "Merdiven Yıkama ve Dezenfeksiyon Hizmeti", "2026-08-18", "FS-8921"},
		{"Demirbaş/Onarım", 4200.00, "Otopark Otomatik Bariyer Motoru Değişimi", "2026-08-25", "FAT-54129"},
		{"Genel Giderler", 2600.00, "Bina Yangın Tüpleri Yıllık Bakım ve Dolumu", "2026-09-05", "FAT-9901"},
		{"Asansör Bakımı", 2200.00, "Schindler Aylık Periyodik Asansör Bakımı", "2026-09-10", "FAT-2026-9114"},
		{"Temizlik", 2100.00, "Aylık Temizlik ve Çöp Poşeti Alımı", "2026-09-15", "FS-9045"},
		{"Demirbaş/Onarım", 3400.00, "Çatı Oluk Tamiratı ve Su İzolasyonu", "2026-09-22", "MAK-2026-44"},
		{"Asansör Bakımı", 2200.00, "Schindler Aylık Periyodik Asansör Bakımı", "2026-10-02", "FAT-2026-1002"},
		{"Temizlik", 2100.00, "Ekim Ayı Temizlik Sarf Malzemeleri", "2026-10-04", "FS-9201"},
	}

	for _, exp := range demoExpenses {
		catID, ok := categoryMap[exp.CategoryName]
		if !ok {
			catID = categoryMap["Genel Giderler"]
		}
		_, err = db.Exec(ctx, `
			INSERT INTO expenses (id, site_id, category_id, amount, description, expense_date, receipt_note, recorded_by, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $5::date + time '15:00:00', NOW())
		`, siteID, catID, exp.Amount, exp.Description, exp.ExpenseDate, exp.ReceiptNote, adminID)
		if err != nil {
			slog.Error("Masraf eklenemedi", "desc", exp.Description, "error", err)
		}
	}
	slog.Info("Kategori bazlı geçmiş masraflar başarıyla kaydedildi")

	// 12. Elektrik Faturası Dağıtımı (Sayaç Okuma / Consumption Period)
	// BEDAŞ Eylül 2026 Elektrik Faturası:
	// Toplam Fatura Tutarı: 9,000.00 TL
	// Ana sayaç: İlk: 18,500.000, Son: 21,500.000 -> Toplam Fatura Tüketimi: 3,000.000 kWh
	// Birim Maliyet: 9,000.00 / 3,000.00 = 3.00 TL/kWh
	// Daireler Toplam Tüketimi: 2,500.000 kWh -> 7,500.00 TL
	// Ortak Alan Tüketimi: 500.000 kWh -> Ortak Alan Maliyeti: 1,500.00 TL (Site Yönetimi Karşılar)
	// Fatura Denkliği: 7,500.00 + 1,500.00 = 9,000.00 TL (Kuruşu kuruşuna denk!)
	periodID := uuid.New().String()
	_, err = db.Exec(ctx, `
		INSERT INTO consumption_periods (
			id, site_id, meter_type_id, period,
			main_meter_previous, main_meter_current,
			total_billed_consumption, total_apartments_consumption, common_area_consumption,
			total_bill_amount, unit_cost, common_area_cost,
			bill_date, bill_no, description, created_by, created_at, updated_at
		) VALUES (
			$1, $2, $3, '2026-09-01',
			18500.000, 21500.000,
			3000.000, 2500.000, 500.000,
			9000.00, 3.0000, 1500.00,
			'2026-09-28', 'CK-2026-098842', 'Eylül 2026 BEDAŞ Ortak + Daireler Elektrik Faturası Dağıtımı',
			$4, '2026-09-28 16:30:00+03', NOW()
		)
	`, periodID, siteID, elektrikMeterTypeID, adminID)
	if err != nil {
		slog.Error("Elektrik faturası dönemi oluşturulamadı", "error", err)
	} else {
		// Daire sayaç endeksleri ve tüketimleri
		aptMeterData := []struct {
			DoorNumber string
			Prev       float64
			Curr       float64
			IsPaid     bool
		}{
			{"1", 1420.000, 1620.000, true},  // 200 kWh -> 600 TL (Yönetici dairesi)
			{"2", 1850.000, 2130.000, true},  // 280 kWh -> 840 TL (Can Arslan - Sakin Demo)
			{"3", 1200.000, 1440.000, true},  // 240 kWh -> 720 TL
			{"4", 2100.000, 2390.000, false}, // 290 kWh -> 870 TL (Açık)
			{"5", 1530.000, 1740.000, true},  // 210 kWh -> 630 TL
			{"6", 1640.000, 1910.000, true},  // 270 kWh -> 810 TL
			{"7", 1310.000, 1540.000, true},  // 230 kWh -> 690 TL
			{"8", 1980.000, 2280.000, false}, // 300 kWh -> 900 TL (Açık)
			{"9", 1150.000, 1370.000, false}, // 220 kWh -> 660 TL (Açık)
			{"10", 1720.000, 1980.000, false}, // 260 kWh -> 780 TL (Açık)
		}

		for _, amd := range aptMeterData {
			// Find apartment
			var matchedApt DemoApartment
			for _, a := range demoApts {
				if a.DoorNumber == amd.DoorNumber {
					matchedApt = a
					break
				}
			}

			consumption := amd.Curr - amd.Prev
			amount := consumption * 3.00 // 3.00 TL/kWh

			debtorID := matchedApt.OwnerID
			if matchedApt.TenantID != nil {
				debtorID = *matchedApt.TenantID
			}

			// Borç kaydı oluştur (utility türünde)
			utilityDebtID := uuid.New().String()
			debtStatus := "open"
			if amd.IsPaid {
				debtStatus = "paid"
			}

			_, err = db.Exec(ctx, `
				INSERT INTO debts (id, site_id, apartment_id, debtor_user_id, type, amount, due_month, description, status, created_by, created_at, updated_at)
				VALUES ($1, $2, $3, $4, 'utility', $5, '2026-09-01', 'Eylül 2026 Elektrik Tüketim Bedeli', $6, $7, '2026-09-28 16:30:00+03', NOW())
			`, utilityDebtID, siteID, matchedApt.ID, debtorID, amount, debtStatus, adminID)
			if err != nil {
				slog.Error("Sayaç borcu eklenemedi", "apt", amd.DoorNumber, "error", err)
			}

			// Eğer ödendiyse ödeme kaydı ekle
			if amd.IsPaid {
				_, err = db.Exec(ctx, `
					INSERT INTO payments (id, debt_id, site_id, amount, payment_method, payment_date, notes, recorded_by, created_at)
					VALUES (gen_random_uuid(), $1, $2, $3, 'transfer', '2026-09-30', 'Eylül 2026 Elektrik Faturası Ödemesi', $4, '2026-09-30 14:00:00+03')
				`, utilityDebtID, siteID, amount, adminID)
				if err != nil {
					slog.Error("Sayaç ödeme kaydı eklenemedi", "error", err)
				}
			}

			// Sayaç okuma detayını ekle
			readingID := uuid.New().String()
			_, err = db.Exec(ctx, `
				INSERT INTO meter_readings (
					id, consumption_period_id, apartment_id,
					previous_reading, current_reading, consumption,
					individual_amount, common_area_amount, total_amount,
					debt_id, debtor_user_id, reading_date, notes, created_at
				) VALUES (
					$1, $2, $3,
					$4, $5, $6,
					$7, 0, $7,
					$8, $9, '2026-09-28', 'Düzenli sayaç okuma', '2026-09-28 16:30:00+03'
				)
			`, readingID, periodID, matchedApt.ID, amd.Prev, amd.Curr, consumption, amount, utilityDebtID, debtorID)
			if err != nil {
				slog.Error("Sayaç okuma detayı eklenemedi", "apt", amd.DoorNumber, "error", err)
			}
		}
		slog.Info("Eylül 2026 Elektrik faturası dağıtımı ve daire sayaç okumaları başarıyla işlendi")
	}

	// 13. Duyurular (Announcements)
	announcements := []struct {
		Title       string
		Content     string
		Priority    string
		PublishedAt string
	}{
		{
			Title:       "2026 Yılı Olağan Kat Malikleri Genel Kurul Toplantısı",
			Content:     "Sitemizin 2026 yılı Olağan Genel Kurul toplantısı 18 Ekim 2026 Pazar günü saat 14:00'te sitemiz sosyal tesis toplantı salonunda gerçekleştirilecektir. Çoğunluk sağlanamadığı takdirde ikinci toplantı 25 Ekim 2026 Pazar günü aynı yer ve saatte yapılacaktır. Toplantı gündemi ve denetim raporu blok panolarına asılmıştır.",
			Priority:    "important",
			PublishedAt: "2026-10-01 09:00:00+03",
		},
		{
			Title:       "Asansör Yıllık Yeşil Etiket Periyodik Kontrolü Tamamlandı",
			Content:     "A ve B blok asansörlerimizin A tipi akredite muayene kuruluşu tarafından gerçekleştirilen yıllık periyodik kontrolleri başarıyla tamamlanmış olup YEŞİL ETİKET (Kusursuz) yenilemesi yapılmıştır. Tüm sakinlerimize güvenli kullanımlar dileriz.",
			Priority:    "normal",
			PublishedAt: "2026-09-12 11:30:00+03",
		},
		{
			Title:       "Ortak Alan Temizliği ve Çöp Toplama Saatleri",
			Content:     "Ortak alanların hijyeni ve düzeni açısından çöp toplama saatleri her akşam 19:30 - 20:30 arasındadır. Belirtilen saatler dışında kat hollerine çöp bırakılmaması ve geri dönüştürülebilir atıkların ayrıştırılması önemle rica olunur.",
			Priority:    "normal",
			PublishedAt: "2026-08-20 10:15:00+03",
		},
	}

	for _, ann := range announcements {
		_, err = db.Exec(ctx, `
			INSERT INTO announcements (id, site_id, title, content, priority, published_at, created_by, created_at, updated_at)
			VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $5, NOW())
		`, siteID, ann.Title, ann.Content, ann.Priority, ann.PublishedAt, adminID)
		if err != nil {
			slog.Error("Duyuru eklenemedi", "title", ann.Title, "error", err)
		}
	}
	slog.Info("Sitenin duyuruları başarıyla eklendi")

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

func ptrStr(s string) *string {
	return &s
}
