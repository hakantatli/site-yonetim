# Site Yönetim — Implementation Plan

> **Stack:** Go + chi · React + Vite · PostgreSQL · goose · sqlc · JWT

---

## Faz 0 — Proje İskeleti & Altyapı

### Backend
- [ ] `go mod init github.com/hakantatli/site-yonetim`
- [ ] Klasör yapısı: `cmd/server/`, `internal/domain/`, `internal/handler/`, `internal/middleware/`, `internal/repository/`, `internal/service/`, `internal/scheduler/`, `internal/config/`
- [ ] Bağımlılık kurulumu:
  - `github.com/go-chi/chi/v5` — router
  - `github.com/pressly/goose/v3` — migration
  - `github.com/sqlc-dev/sqlc` — sorgu üreteci
  - `github.com/jackc/pgx/v5` — PostgreSQL driver
  - `github.com/golang-jwt/jwt/v5` — JWT
  - `golang.org/x/crypto` — bcrypt
  - `github.com/robfig/cron/v3` — cron job
  - `github.com/joho/godotenv` — .env yükleme
- [ ] `backend/Dockerfile.dev` (air ile hot-reload)
- [ ] `backend/.air.toml` konfigürasyonu
- [ ] `sqlc.yaml` konfigürasyonu
- [ ] Migration çalıştırma: `goose up`

### Frontend
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Bağımlılık kurulumu:
  - `react-router-dom` v7
  - `@tanstack/react-query`
  - `zustand`
  - `axios`
  - `tailwindcss` + `@tailwindcss/vite`
  - `shadcn/ui` init
- [ ] `frontend/Dockerfile.dev` (Vite dev server)
- [ ] Temel klasör yapısı: `src/pages/`, `src/components/`, `src/hooks/`, `src/store/`, `src/api/`, `src/router/`

### Ortak
- [ ] `.env` dosyası oluştur (`.env.example`'dan kopyala)
- [ ] `docker compose up postgres` — DB ayağa kaldır
- [ ] Migration çalıştır: ilk schema aktif
- [ ] `docker compose --profile tools up pgadmin` — pgAdmin kontrol

---

## Faz 1 — Auth Sistemi

### Backend
- [ ] `config` paketi: ortam değişkenlerini oku (`DATABASE_URL`, `JWT_SECRET` vb.)
- [ ] DB bağlantısı: `pgxpool` ile connection pool
- [ ] `users` repository: `GetByEmail`, `GetByID`, `UpdateLastLogin`
- [ ] `auth` service:
  - `Login(email, password)` → şifre bcrypt ile doğrula → JWT üret
  - `RefreshToken(token)` → DB'den kontrol, rotate et
  - `Logout(token)` → refresh token'ı iptal et (`revoked_at`)
- [ ] JWT üretimi: payload `{ user_id, role, site_id }`
- [ ] **Middleware stack:**
  - `AuthMiddleware` — token geçerliliği
  - `RoleMiddleware(roles ...string)` — rol kontrolü
  - `SiteIsolationMiddleware` — `user.site_id == request_resource.site_id`
- [ ] Endpoint'ler:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
- [ ] Owner seed: ilk owner kullanıcısını DB'ye yaz (migration veya seed script)

### Frontend
- [ ] `src/api/client.ts` — Axios instance, baseURL, interceptor (token ekleme + 401 → refresh)
- [ ] `src/api/auth.ts` — login, logout, refresh fonksiyonları
- [ ] `src/store/auth.ts` — Zustand: user, token, role, siteId
- [ ] `/login` sayfası — form, validation, hata mesajı
- [ ] `ProtectedRoute` componenti — role'e göre yönlendirme
- [ ] Router yapısı: `/owner/*`, `/admin/*`, `/resident/*` korumalı rotalar

---

## Faz 2 — Owner Paneli

### Backend
- [ ] `sites` repository: `Create`, `List`, `GetByID`, `UpdateLimit`
- [ ] `users` repository: `Create` (admin oluşturma için)
- [ ] `sites` service: site oluşturma, yönetici atama
- [ ] Endpoint'ler:
  - `GET    /api/v1/owner/sites` — site listesi
  - `POST   /api/v1/owner/sites` — yeni site
  - `GET    /api/v1/owner/sites/:id` — site detayı
  - `POST   /api/v1/owner/sites/:id/admins` — yönetici ata (email + şifre)
  - `PATCH  /api/v1/owner/sites/:id/limit` — daire limitini artır

### Frontend
- [ ] `/owner/sites` — site listesi (daire sayısı, limit durumu)
- [ ] `/owner/sites/new` — yeni site formu
- [ ] `/owner/sites/:id` — site detayı + yönetici atama formu
- [ ] Owner, herhangi bir sitenin admin paneline geçiş yapabilmeli (`site_id` override)

---

## Faz 3 — Admin Paneli: Daire & Sakin Yönetimi

### Backend
- [ ] `blocks` repository: `Create`, `List`, `Delete`
- [ ] `apartments` repository: `Create`, `List`, `GetByID`, `Update`, `SoftDelete`
- [ ] **Freemium limit kontrolü:** daire eklenmeden önce `COUNT(active) < apartment_limit` kontrolü
- [ ] `users` repository: `CreateResident`
- [ ] Endpoint'ler:
  - `GET/POST/DELETE /api/v1/admin/blocks`
  - `GET    /api/v1/admin/apartments` — aktif daireler
  - `POST   /api/v1/admin/apartments` — yeni daire (limit kontrolü!)
  - `GET    /api/v1/admin/apartments/:id`
  - `PATCH  /api/v1/admin/apartments/:id`
  - `DELETE /api/v1/admin/apartments/:id` — soft delete
  - `POST   /api/v1/admin/apartments/:id/owner` — ev sahibi ata
  - `POST   /api/v1/admin/apartments/:id/tenant` — kiracı ata
  - `DELETE /api/v1/admin/apartments/:id/tenant` — kiracı çıkar (borç aksiyon seçimi ile)

### Frontend
- [ ] `/admin/apartments` — daire listesi (blok, kapı no, ev sahibi, kiracı, durum)
- [ ] Daire ekleme/düzenleme modal/formu
- [ ] Freemium limit dolunca engel mesajı ve yükseltme yönlendirmesi
- [ ] Kiracı değişim modal: eski borç için `keep / transfer / delete` seçim ekranı

---

## Faz 4 — Aidat ve Borç Sistemi

### Backend
- [ ] `due_rates` repository: `Create`, `GetCurrent`, `List`
- [ ] `debts` repository: `Create`, `GetByApartment`, `GetByUser`, `UpdateStatus`
- [ ] `due_rates` service: aidat güncelleme (geçerlilik tarihi seçimi)
- [ ] `debts` service:
  - Manuel borç oluşturma (fixture, investment, other)
  - `CreateMonthlyDebts(month time.Time)` — tüm aktif daireler için aidat tahakkuku (cron bu fonksiyonu çağırır)
- [ ] **Cron job:** `scheduler` paketi, `robfig/cron` ile her ayın 1'i `CreateMonthlyDebts` çalışır
  - `// TODO: Bildirim hook noktası — ileride sakinlere e-posta gönderilebilir`
- [ ] Endpoint'ler:
  - `GET/POST /api/v1/admin/due-rates` — aidat geçmişi ve yeni aidat
  - `GET      /api/v1/admin/debts` — tüm borçlar (filtreli: ay, durum, daire)
  - `POST     /api/v1/admin/debts` — manuel borç oluştur
  - `GET      /api/v1/admin/debts/:id` — borç detayı (debt_summary view)

### Frontend
- [ ] `/admin/dues` — aidat yönetimi (mevcut tutar, geçmiş, yeni tutar formu)
- [ ] `/admin/debts` — borç listesi (filtreli, daire ve kişi bazlı)
- [ ] Borç detay sayfası: ödeme geçmişi + kalan bakiye

---

## Faz 5 — Tahsilat (Ödeme Girişi)

### Backend
- [ ] `payments` repository: `Create`, `GetByDebt`, `GetBySite`
- [ ] `payments` service:
  - `RecordPayment(debtID, amount, method)` — transaction içinde:
    1. Ödeme kaydı oluştur
    2. Toplam ödemeyi hesapla
    3. `debt.status` güncelle (open → partial → paid)
  - `// TODO: Bildirim hook noktası — ödeme onayı sakin e-postası`
- [ ] Endpoint'ler:
  - `POST /api/v1/admin/payments` — ödeme kaydet
  - `GET  /api/v1/admin/payments` — ödeme listesi (site bazlı, tarih filtreli)

### Frontend
- [ ] Ödeme girişi formu (borç seçimi, tutar, yöntem: nakit/havale, not)
- [ ] Kısmi ödeme göstergesi: `₺X / ₺Y ödendi` progress bar'ı
- [ ] Borç listesinde ödeme durumu badge'leri (Açık / Kısmi / Ödendi)

---

## Faz 6 — Masraf ve Şeffaf Kasa

### Backend
- [ ] `expense_categories` repository: `Create`, `List`, `Update`, `Deactivate`
- [ ] `expenses` repository: `Create`, `List`, `GetMonthlySummary`
- [ ] Site oluşturulunca otomatik varsayılan kategoriler eklenir (service katmanı)
- [ ] `monthly_cashflow` view sorgusu
- [ ] Endpoint'ler:
  - `GET/POST/PATCH/DELETE /api/v1/admin/expense-categories`
  - `GET/POST              /api/v1/admin/expenses`
  - `GET                   /api/v1/admin/treasury` — aylık kasa özeti
  - `GET                   /api/v1/resident/treasury` — sakin için aynı özet (salt okunur)
  - `// TODO: Rapor hook noktası — PDF ekstre ileride buradan üretilebilir`

### Frontend
- [ ] `/admin/expenses` — masraf listesi + yeni masraf formu
- [ ] `/admin/categories` — kategori yönetimi (ekle, düzenle, pasifleştir)
- [ ] `/admin/treasury` — kasa özeti: aylık gelir/gider tablosu, kategori dağılımı
- [ ] Şeffaf kasa sakin görünümü (aynı data, sadece okuma)

---

## Faz 7 — Duyuru Panosu

### Backend
- [ ] `announcements` repository: `Create`, `Update`, `Delete`, `ListBySite`
- [ ] Endpoint'ler:
  - `GET    /api/v1/admin/announcements`
  - `POST   /api/v1/admin/announcements`
  - `PATCH  /api/v1/admin/announcements/:id`
  - `DELETE /api/v1/admin/announcements/:id`
  - `GET    /api/v1/resident/announcements` — sakin (salt okunur)
  - `// TODO: Bildirim hook noktası — yeni duyuru sakinlere e-posta`

### Frontend
- [ ] `/admin/announcements` — duyuru listesi + oluştur/düzenle/sil
- [ ] Öncelik badge'leri: Normal (gri) / Önemli (sarı) / Acil (kırmızı)
- [ ] `/resident/announcements` — sakin görünümü (salt okunur)

---

## Faz 8 — Sakin Paneli

### Backend
- [ ] `resident` endpoint'leri (site izolasyonu middleware ile güvence altında):
  - `GET /api/v1/resident/me/debts` — kendi borçları (debt_summary)
  - `GET /api/v1/resident/me/payments` — geçmiş ödemeler
  - `GET /api/v1/resident/treasury` — şeffaf kasa
  - `GET /api/v1/resident/announcements` — duyurular

### Frontend
- [ ] `/resident/dashboard` — borç özeti, son ödemeler, duyuru önizlemesi
- [ ] `/resident/debts` — borç ve ödeme geçmişi detayı
- [ ] `/resident/treasury` — kasa özeti
- [ ] `/resident/announcements` — duyuru listesi

---

## Faz 9 — Hata Yönetimi, Validasyon & Güvenlik

### Backend
- [ ] Global error handler middleware (standart JSON hata formatı)
- [ ] Request validasyon katmanı (tüm input'lar kontrol edilir)
- [ ] Rate limiting (login endpoint için)
- [ ] CORS ayarları (sadece frontend origin'e izin)
- [ ] Structured logging (`slog` paketi)

### Frontend
- [ ] Global API hata yakalama (Axios interceptor)
- [ ] Form validasyon (react-hook-form + zod)
- [ ] Loading / skeleton state'leri
- [ ] Toast bildirimleri (başarı / hata)
- [ ] Boş durum ekranları (veri yoksa gösterim)

---

## Faz 10 — Deployment Hazırlığı

- [ ] `backend/Dockerfile` (production — multi-stage, küçük binary)
- [ ] `frontend/Dockerfile` (production — nginx ile static serve)
- [ ] `docker-compose.prod.yml`
- [ ] Caddy veya nginx reverse proxy konfigürasyonu
- [ ] Environment variable kontrol listesi (prod secret'lar)
- [ ] `goose up` production migration akışı

---

## Mevcut Dosya Yapısı (Şu An)

```
site-yonetim/
├── backend/
│   └── migrations/
│       └── 00001_initial_schema.sql  ✅
├── docker-compose.yml                ✅
├── .env.example                      ✅
├── .gitignore                        ✅
├── gemini.md                         ✅
└── claude.md                         ✅
```

---

## Çalıştırma Komutları (Referans)

```bash
# Sadece DB'yi ayağa kaldır (geliştirme için önerilen)
cp .env.example .env
docker compose up postgres -d

# DB + pgAdmin
docker compose --profile tools up -d

# Tüm stack (backend + frontend Dockerfile hazır olunca)
docker compose --profile app up -d

# Migration çalıştır (goose kuruluysa)
cd backend
goose -dir migrations postgres "$DATABASE_URL" up

# Migration durumu
goose -dir migrations postgres "$DATABASE_URL" status
```
