# Site Yönetim — Implementation Plan

> **Stack:** Go + chi · React + Vite · PostgreSQL · goose · sqlc · JWT
> **Test:** Go `testing` + `vitest` (Frontend)
> **CI/CD:** GitHub Actions (Self-Hosted Runner Deploy)

---

## Faz 0 — Proje İskeleti & Altyapı

### Backend
- [x] `go mod init github.com/hakantatli/site-yonetim`
- [x] Klasör yapısı: `cmd/server/`, `internal/domain/`, `internal/handler/`, `internal/middleware/`, `internal/repository/`, `internal/service/`, `internal/scheduler/`, `internal/config/`
- [x] Bağımlılık kurulumu:
  - `github.com/go-chi/chi/v5` — router
  - `github.com/pressly/goose/v3` — migration
  - `github.com/sqlc-dev/sqlc` — sorgu üreteci
  - `github.com/jackc/pgx/v5` — PostgreSQL driver
  - `github.com/golang-jwt/jwt/v5` — JWT
  - `golang.org/x/crypto` — bcrypt
  - `github.com/robfig/cron/v3` — cron job
  - `github.com/joho/godotenv` — .env yükleme
- [x] `backend/Dockerfile.dev` (air ile hot-reload)
- [x] `backend/.air.toml` konfigürasyonu
- [x] `sqlc.yaml` konfigürasyonu + `sqlc generate`
- [x] Migration çalıştırma: `goose up` (13 tablo hazır)

### Frontend
- [x] `npm create vite@latest frontend -- --template react-ts`
- [x] Bağımlılık kurulumu:
  - `react-router-dom` v7
  - `@tanstack/react-query`
  - `zustand`
  - `axios`
  - `tailwindcss` + `@tailwindcss/vite`
  - `lucide-react`, `clsx`, `tailwind-merge`
- [x] `frontend/Dockerfile.dev` (Vite dev server)
- [x] Temel klasör yapısı: `src/pages/`, `src/components/`, `src/hooks/`, `src/store/`, `src/api/`, `src/router/`
- [x] `@/*` path alias ve Tailwind v4 entegrasyonu
- [x] `apiClient` (Axios) ve `useAuthStore` (Zustand) iskeletleri

### Ortak
- [x] `.env` dosyası oluşturuldu (`.env.example`'dan)
- [x] `docker compose up postgres` — DB ayağa kaldırıldı ve sağlıklı
- [x] Migration çalıştırıldı: 13 tablo + 2 view hazır
- [x] `docker compose --profile app up -d` ile backend + frontend + DB full stack çalışır durumda

---

## Faz 1 — Auth Sistemi

### Backend
- [x] `config` paketi: ortam değişkenlerini oku (`DATABASE_URL`, `JWT_SECRET`, TTL vb.)
- [x] DB bağlantısı: `pgxpool` ile connection pool
- [x] `users` repository: `GetByEmail`, `GetByPhone`, `GetByID`, `Create`, `CountOwners`
- [x] `refresh_tokens` repository: `CreateRefreshToken`, `GetRefreshToken`, `RevokeRefreshToken`
- [x] `auth` service:
  - `Login(identifier, password)` → telefon veya email ile bcrypt doğrula → JWT üret
  - `Refresh(token)` → DB'den kontrol, rotate et
  - `Logout(token)` → refresh token'ı iptal et (`revoked_at`)
- [x] JWT üretimi: payload `{ user_id, phone, role, site_id }`
- [x] **Middleware stack:**
  - `AuthMiddleware` — token geçerliliği ve context'e enjeksiyon
  - `RoleMiddleware(roles ...domain.UserRole)` — rol kontrolü
  - `SiteIsolationMiddleware` — `user.site_id == request_resource.site_id` (Owner her yere erişebilir, Admin/Resident izole)
- [x] Endpoint'ler:
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET  /api/v1/auth/me`
- [x] Owner seed: ilk owner kullanıcısı otomatik oluşturuldu (`5550000000` / `admin@siteyonetim.local` / `AdminPassword123!`)

### Frontend
- [x] `src/api/client.ts` — Axios instance, baseURL, otomatik 401 token refresh queue mekanizması
- [x] `src/api/auth.ts` — login, refresh, logout, getMe API fonksiyonları
- [x] `src/store/auth.ts` — Zustand: user, token, role, siteId
- [x] `/login` sayfası — modern form, hata bildirimleri, otomatik yönlendirme ve dev login kısayolu
- [x] `ProtectedRoute` componenti — role bazlı rota koruması (Owner tam erişim, Admin/Resident ayrımı)
- [x] Router yapısı: `/owner/*`, `/admin/*`, `/resident/*` korumalı rotalar ve dashboard iskeletleri

---

## Faz 2 — Owner Paneli

### Backend
- [x] `sites` repository: `Create`, `List`, `GetByID`, `GetDetails`, `UpdateLimit`, `CreateDefaultCategories`
- [x] `users` repository: `ListAdminsBySiteID` eklendi, yönetici oluşturma bağlandı
- [x] `sites` service: site oluşturma (otomatik 6 varsayılan masraf kategorisi seed edilir), yönetici atama (bcrypt hash), limit güncelleme
- [x] Endpoint'ler (Owner korumalı):
  - `GET    /api/v1/owner/sites` — site listesi (daire sayısı, yönetici sayısı)
  - `POST   /api/v1/owner/sites` — yeni site oluşturma
  - `GET    /api/v1/owner/sites/:id` — site detayı (daire, blok, sakin sayıları ve atanmış yöneticiler)
  - `POST   /api/v1/owner/sites/:id/admins` — yönetici ata (telefon, şifre, ad soyad, email)
  - `PATCH  /api/v1/owner/sites/:id/limit` — daire limitini güncelle

### Frontend
- [x] `src/api/owner.ts` — site listesi, site detayı, limit güncelleme ve yönetici atama API çağrıları
- [x] `/owner/sites` (`OwnerDashboard.tsx`) — site kartları, filtreleme, doluluk çubuğu, freemium/özel etiketleri, hızlı istatistikler ve yeni site modalı
- [x] `/owner/sites/:id` (`SiteDetailPage.tsx`) — site detayları, istatistik kartları, canlı limit düzenleme, atanmış yönetici listesi, yeni yönetici atama modalı ve "Yönetici Olarak Giriş Yap" geçişi

---

## Faz 3 — Admin Paneli: Daire & Sakin Yönetimi

### Backend
- [x] `blocks` repository: `CreateBlock`, `ListBlocks`, `DeleteBlock`
- [x] `apartments` repository: `CountActiveApartments`, `ListApartments`, `GetApartmentByID`, `CreateApartment`, `UpdateApartment`, `SoftDeleteApartment`, `SetApartmentOwner`, `SetApartmentTenant`, `RemoveApartmentTenant`
- [x] `tenant_history` repository: `CreateTenantHistory`, `EndTenantHistory`, `ListTenantHistoryByApartmentID`
- [x] **Freemium limit kontrolü:** Daire eklenirken `count >= site.apartment_limit` kontrolü (sınır aşımında `403 Forbidden` ve `LIMIT_EXCEEDED` hatası ile tamamen bloke edilir)
- [x] **Kiracı değişimi & Borç yönetimi:** Kiracı çıkarılırken `debt_action: keep | transfer | delete` seçenekleri işletilir (`transfer` durumunda açık borçlar ev sahibine aktarılır, `delete` durumunda açık borçlar silinir, `keep` durumunda eski kiracıda kalır)
- [x] **Soft delete:** Daire pasife alındığında `is_active = FALSE`, `deleted_at = NOW()` uygulanır, veriler korunur
- [x] Endpoint'ler (Admin & Owner):
  - `GET/POST/DELETE /api/v1/admin/blocks`
  - `GET    /api/v1/admin/apartments` — aktif daireler listesi (blok, ev sahibi, kiracı bilgileriyle)
  - `POST   /api/v1/admin/apartments` — yeni daire (freemium limit kontrolüyle)
  - `GET    /api/v1/admin/apartments/:id` — daire detayı
  - `PATCH  /api/v1/admin/apartments/:id` — daire güncelleme
  - `DELETE /api/v1/admin/apartments/:id` — soft delete
  - `POST   /api/v1/admin/apartments/:id/owner` — ev sahibi ata / oluştur
  - `POST   /api/v1/admin/apartments/:id/tenant` — kiracı ata / oluştur
  - `DELETE /api/v1/admin/apartments/:id/tenant` — kiracı çıkar (borç aksiyonu ve notla)
  - `GET    /api/v1/admin/apartments/:id/tenant-history` — kiracı geçmişi listesi

### Frontend
- [x] `src/api/admin.ts` — Bloklar, daireler, sakinler ve kiracı geçmişi için tam API entegrasyonu
- [x] `src/types/apartment.ts` — Daire, blok, kiracı geçmişi ve istek tipleri
- [x] `/admin/dashboard` (`AdminDashboard.tsx`):
  - Daire istatistikleri (Toplam, Kiracılı, Ev Sahibi, Boş)
  - Daire ve blok sekme navigasyonu
  - Filtreleme ve arama çubuğu
  - Yeni daire modalı (Blok seçimi, Kapı No, Kat, Ev Sahibi ve Kiracı anında ekleme)
  - Yeni blok tanımlama ve silme
  - Ev sahibi / kiracı atama modalı
  - Kiracı çıkışında 3 seçenekli borç kararı modalı (Bırak / Ev Sahibine Devret / Sil)
  - Kiracı geçmişi timeline modalı
  - Daire pasife alma (soft delete) onay akışı
  - Owner için siteye geçiş desteği (`?siteId=...`) ve geri dönüş butonu

---

## Faz 4 — Aidat ve Borç Sistemi

### Backend
- [x] `due_rates` repository: `Create`, `GetCurrent`, `List`
- [x] `debts` repository: `Create`, `GetByApartment`, `GetByUser`, `UpdateStatus`, `DeleteDebt`, `CreateBulkDebt`
- [x] `due_rates` service: aidat güncelleme (geçerlilik tarihi seçimi: bu ay / gelecek ay)
- [x] `debts` service:
  - Manuel borç oluşturma (fixture, investment, other)
  - Tüm dairelere toplu borçlandırma (demirbaş -> malik, rutin -> kiracı/malik)
  - Hatalı borç silme (ödemesi olmayan borçlar için)
  - `CreateMonthlyDebts(month time.Time)` — tüm aktif daireler için aidat tahakkuku (cron bu fonksiyonu çağırır)
- [x] **Cron job:** `scheduler` paketi, `robfig/cron` ile her ayın 1'i `CreateMonthlyDebts` çalışır
  - `// TODO: Bildirim hook noktası — ileride sakinlere e-posta gönderilebilir`
- [x] Endpoint'ler:
  - `GET/POST /api/v1/admin/due-rates` — aidat geçmişi ve yeni aidat
  - `GET      /api/v1/admin/debts` — tüm borçlar (filtreli: ay, durum, daire)
  - `POST     /api/v1/admin/debts` — manuel tekil borç oluştur
  - `POST     /api/v1/admin/debts/bulk` — tüm dairelere toplu borç oluştur
  - `DELETE   /api/v1/admin/debts/:id` — borç silme
  - `GET      /api/v1/admin/debts/:id` — borç detayı (debt_summary view)

### Frontend
- [x] Aidat Ayarları sekmesi (mevcut tutar, geçerlilik tarihi, geçmiş aidat tablosu)
- [x] Borçlar sekmesi (durum, tür, daire filtreleri, kalan bakiye progress barı)
- [x] Tekil borç ekleme modalı ve tüm dairelere toplu borç ekleme modalı
- [x] Borç silme ve detaylı borç ödeme geçmişi modalı

---

## Faz 5 — Tahsilat (Ödeme Girişi)

### Backend
- [x] `payments` repository: `Create`, `GetByDebt`, `GetBySite`, `Delete`, `GetTotalPaidForDebt`, `GetStats`
- [x] `payments` service:
  - `RecordPayment(debtID, amount, method)` — iş mantığı ve validasyon:
    1. Ödeme kaydı oluştur
    2. Toplam ödemeyi hesapla
    3. Fazla ödeme desteği (otomatik tam ödendiye çekme ve fazla tutarı nota işleme)
    4. `debt.status` güncelle (open → partial → paid)
  - `DeletePayment(id)` — hatalı ödemeyi geri alma ve borç durumunu otomatik güncelleme
  - `// TODO: Bildirim hook noktası — ödeme onayı sakin e-postası/SMS`
- [x] Endpoint'ler:
  - `POST   /api/v1/admin/payments` — ödeme kaydet
  - `GET    /api/v1/admin/payments` — ödeme listesi (site bazlı, tarih/daire/yöntem filtreli)
  - `GET    /api/v1/admin/payments/stats` — tahsilat istatistikleri
  - `GET    /api/v1/admin/payments/:id` — tekil ödeme detayı
  - `DELETE /api/v1/admin/payments/:id` — ödeme sil / iptal et
  - `GET    /api/v1/admin/debts/:id/payments` — borca ait ödeme geçmişi

### Frontend
- [x] Tahsilatlar sekmesi ve detaylı filtreli tablo (nakit/havale, daire, tarih aralığı)
- [x] 4 adet finansal özet kartı (toplam tahsilat, nakit, havale/EFT, işlem sayısı)
- [x] Ödeme girişi modalı (otomatik borç bilgisi, kalan tutar hızlı doldurma, nakit/havale kartları, tarih ve not)
- [x] Kısmi ödeme göstergesi: borçlar tablosunda `₺X / ₺Y ödendi` progress bar'ı
- [x] Borç listesinde ödeme durumu badge'leri (Açık / Kısmi / Ödendi) ve "Ödeme Al" aksiyon butonu
- [x] Borç ödeme geçmişi modalı (parçalı ödemeleri listeleme ve ödeme silme)

---

## Faz 6 — Masraf ve Şeffaf Kasa

### Backend
- [x] `expense_categories` repository: `Create`, `List`, `Update`, `Deactivate`, `Delete`
- [x] `expenses` repository: `Create`, `List`, `Delete`, `GetExpenseStats`, `GetCategoryBreakdown`
- [x] Site oluşturulunca otomatik varsayılan 6 kategori eklenir (service katmanı)
- [x] `monthly_cashflow` view sorgusu (TO_CHAR ile YYYY-MM gruplama)
- [x] Sitelere devir / açılış bakiyesi (`initial_balance`) alanı ve güncelleme desteği
- [x] Endpoint'ler:
  - `GET/POST/PATCH/DELETE /api/v1/admin/expense-categories`
  - `GET/POST/DELETE       /api/v1/admin/expenses`
  - `GET                   /api/v1/admin/treasury` — aylık kasa özeti & nakit akışı
  - `PATCH                 /api/v1/admin/treasury/initial-balance` — açılış bakiyesi güncelleme
  - `GET                   /api/v1/resident/treasury` — sakin için aynı özet (salt okunur)

### Frontend
- [x] Masraflar sekmesi — masraf listesi, filtreler (kategori, tarih), toplam & aylık özet kartları
- [x] Yeni masraf ekleme modalı (kategori seçimi, tutar, tarih, fiş/fatura no, açıklama)
- [x] Kategori yönetimi modalı (ekle, yerinde isim düzenle, aktif/pasif toggle, güvenli silme)
- [x] Şeffaf Kasa sekmesi — net kasa bakiyesi, devir bakiyesi düzenleme, kümülatif ve bu ayki gelir/gider kartları, kategori dağılımı, son 12 ayın nakit akışı tablosu
- [x] Sakin Paneli Şeffaf Kasa görünümü (`ResidentDashboard`) — sakinler için 7/24 salt okunur şeffaf kasa ve gelir/gider dökümü

---

## Faz 7 — Sayaç Okuma & Tüketime Dayalı Borçlandırma (Su, Doğal Gaz)

### Backend
- [x] `meter_types` tablosu ve repository'si (Su, Doğal Gaz, Isı Pay Ölçer vb. birim tanımları)
- [x] `consumption_periods` ve `apartment_meter_readings` tabloları
- [x] `meter_service`:
  - Fatura tutarı ve ana sayaç ilk/son endeksinden birim fiyat çıkarma (`Birim Fiyat = Fatura / Fatura Tüketimi`)
  - Dairelerin tüketim bedelleri (`Daire Tüketimi * Birim Fiyat`)
  - Ortak alan tüketimi ve bedelinin aktif dairelere eşit paylaştırılması
  - **Kuruş Dengeleme:** Bölme/yuvarlama kuruş farklarının en yüksek tüketimli daireye dengelenmesi (`sum(daire_borçları) == fatura_tutarı`)
  - Otomatik `utility` türünde borç tahakkuku (kiracı varsa kiracıya, yoksa ev sahibine)
- [x] Endpoint'ler:
  - `GET/POST /api/v1/admin/meters/types`
  - `GET/POST /api/v1/admin/meters/periods`
  - `GET      /api/v1/admin/meters/periods/:id`
  - `GET      /api/v1/admin/meters/previous-readings`

### Frontend
- [x] Sayaç ve Tüketim Dağıtımı sekmesi (`AdminDashboard.tsx`)
- [x] Sayaç Türleri Yönetim modalı (yeni tür/birim ekleme)
- [x] Sayaç Okuma ve Fatura Dağıtım modalı (`MeterDistributionModal.tsx`):
  - Fatura tutarı, ana sayaç endeksleri ve otomatik birim maliyet hesabı
  - Bir önceki ayın son endekslerini otomatik getiren daire tüketim tablosu
  - Ortak alan tüketim özeti ve daire başı ek maliyet önizlemesi
  - Canlı toplam borç kontrolü
- [x] Tüketim Dönemi Detay modalı (`MeterPeriodDetailModal.tsx`)

---

## Faz 8 — Aylık Gelir & Gider Raporları (Yazdırma / PDF Ekstre)

### Frontend & Rapor Modülü
- [x] `MonthlyReportModal.tsx` — Aylık Gelir (Tahsilatlar) ve Gider (Masraflar) raporlama modalı
- [x] Tek satırlı numaralı döküm: `No` → `Tarih` → `İşlem Detayı` (Daire/Sakin/Borç Türü/Ödeme Yöntemi veya Kategori/Açıklama/Fiş No) → `Tutar`
- [x] Rapor altı genel özet (İşlem sayısı, toplam tutar)
- [x] `@media print` CSS kuralları ile tarayıcı üzerinden doğrudan yazdırma ve PDF kaydetme desteği (`window.print()`)
- [x] Admin Dashboard ve Owner Panelinden tek tıkla erişim butonları

---

## Faz 9 — Duyuru Panosu

### Backend
- [x] `announcements` repository: `Create`, `Update`, `Delete`, `ListBySite`
- [x] Endpoint'ler:
  - `GET    /api/v1/admin/announcements`
  - `POST   /api/v1/admin/announcements`
  - `PATCH  /api/v1/admin/announcements/:id`
  - `DELETE /api/v1/admin/announcements/:id`
  - `GET    /api/v1/resident/announcements` — sakin (salt okunur)
  - `// TODO: Bildirim hook noktası — yeni duyuru sakinlere e-posta`

### Frontend
- [x] Admin Dashboard Duyurular sekmesi — duyuru listesi + oluştur/düzenle/sil modalı
- [x] Öncelik badge'leri: Normal (mavi/gri) / Önemli (sarı/amber) / Acil (kırmızı/rose)
- [x] Resident Dashboard Duyurular sekmesi — sakin görünümü (salt okunur, acil durum ikaz şeridi)

---

## Faz 10 — Sakin Paneli

### Backend
- [x] `resident` endpoint'leri (site izolasyonu middleware ile güvence altında):
  - [x] `GET /api/v1/resident/me/debts` — kendi borçları (debt_summary)
  - [x] `GET /api/v1/resident/me/payments` — geçmiş ödemeler
  - [x] `GET /api/v1/resident/treasury` — şeffaf kasa
  - [x] `GET /api/v1/resident/announcements` — duyurular

### Frontend
- [x] `/resident/dashboard` — borç özeti, son ödemeler, duyuru önizlemesi
- [x] `/resident/debts` — borç ve ödeme geçmişi detayı
- [x] `/resident/treasury` — şeffaf kasa özeti
- [x] `/resident/announcements` — duyuru listesi

---

## Faz 11 — Hata Yönetimi, Validasyon & Güvenlik

### Backend
- [x] Global error handler middleware (JSONRecoverer & standart JSON hata formatı)
- [x] Request validasyon katmanı (tüm input'lar kontrol edilir)
- [x] Rate limiting (login endpoint için IP bazlı in-memory token bucket middleware)
- [x] CORS ayarları (güvenli origin listesi, AllowCredentials uyumlu)
- [x] Structured logging (`slog` paketi ile panic ve hata loglaması)

### Frontend
- [x] Global API hata yakalama (Axios interceptor ile 429 ve 500 yakalama)
- [x] Form validasyon ve kontrolleri
- [x] Loading / disabled state'leri
- [x] Toast bildirimleri (başarı / hata için Zustand bazlı modern ToastContainer)
- [x] Boş durum ekranları (veri yoksa gösterim ve alert() temizliği)

---

## Faz 12 — Kapsamlı Unit Testler & Otomatik CI/CD (Self-Hosted Runner Deploy)

### Backend Unit Testleri (Go)
- [x] `mocks_test.go` — DB bağımsız bellek içi mock repository altyapısı
- [x] `auth_service_test.go` — Login, şifre kontrolü, pasif kullanıcı, JWT doğrulama, token rotasyonu
- [x] `site_service_test.go` — Site oluşturma, 6 varsayılan masraf kategorisi seeding, bcrypt şifreli admin atama
- [x] `apartment_service_test.go` — Freemium 10 daire sınırı kontrolü, kiracı tahliye borç aksiyonları (`keep`, `transfer`, `delete`)
- [x] `due_service_test.go` — Demirbaş borcunu ev sahibine zorunlu atama, rutin borç kiracı önceliği, aylık aidat tahakkuku
- [x] `payment_service_test.go` — Kısmi ödeme bakiye takibi, borç durum geçişleri, fazla ödeme nota işleme, mükerrer ödeme engeli
- [x] `expense_service_test.go` — Kategori bazlı masraf takibi, pasif kategori engeli, şeffaf kasa net bakiye hesabı
- [x] `meter_service_test.go` — Fatura birim fiyatı, ortak alan eşit paylaştırma, kuruş dengeleme (`sum == bill`)
- [x] `announcement_service_test.go` — Başlık/içerik validasyonu, öncelik kontrolleri
- [x] `middleware/*_test.go` — Rol yetkilendirme, site izolasyonu, rate limiter, panic JSONRecoverer

### Frontend Unit Testleri (Vitest)
- [x] `frontend/package.json` — `vitest` kurulumu ve `npm run test` script'i
- [x] `auth.test.ts` — Login, role getter'ları (`isOwner`, `isAdmin`, `isResident`), logout ve localStorage temizliği
- [x] `toast.test.ts` — Toast ekleme, tip kontrolleri (`success`, `error`, `warning`), tekil silme ve otomatik kapanma

### CI/CD Pipeline (`.github/workflows/ci-cd.yml`)
- [x] `test-backend` job'ı (`runs-on: ubuntu-latest`, Go 1.24, `go vet`, `go test -v -race -cover ./...`)
- [x] `test-frontend` job'ı (`runs-on: ubuntu-latest`, Node 22, `npm ci`, `npm run lint`, `npm run test`, `npm run build`)
- [x] `deploy` job'ı (`runs-on: self-hosted`, sadece `main` push ve testler başarılıysa çalışır, `git pull` & `docker compose up -d --build`)

---

## Faz 13 — Production Deployment & Canlıya Alma (binaportal.com)

- [x] `backend/Dockerfile` (production multi-stage binary)
- [x] `backend/entrypoint.sh` (otomatik `goose up` migration & sunucu başlatıcı)
- [x] `frontend/Dockerfile` (production multi-stage static nginx serve)
- [x] `frontend/nginx.conf` (SPA fallback & gzip optimizasyonlu Nginx yapılandırması)
- [x] `docker-compose.prod.yml` (`binaportal.com` & `www.binaportal.com` Traefik v3 HTTPS websecure, Let's Encrypt resolver `le`, HTTP yönlendirme)
- [x] `.env.production.example` (güvenli canlı ortam şablonu)
- [x] `.github/workflows/ci-cd.yml` (Self-Hosted Runner otomatik deploy, `PROD_ENV` secrets desteği, `docker image prune`)
- [x] Geliştirme ortamında Traefik entegrasyonu (`site_yonetim.localhost` routing, Traefik v3 docker socket onarımı)
- [ ] OCI sunucusunda canlı test ve doğrulama (`https://binaportal.com`)

---

## Dosya Yapısı

```
site-yonetim/
├── .github/
│   └── workflows/
│       └── ci-cd.yml                     ✅ CI/CD Pipeline (Cloud Tests + Self-Hosted Deploy)
├── backend/
│   ├── cmd/server/main.go                ✅ HTTP Server & Router Giriş Noktası
│   ├── internal/
│   │   ├── config/                       ✅ Ortam Değişkenleri
│   │   ├── domain/                       ✅ Tipler & Arayüzler
│   │   ├── handler/                      ✅ HTTP İstek Yakalayıcıları
│   │   ├── middleware/                   ✅ Auth, Role, Site Isolation, Rate Limiter, Error Handler (+ Tests)
│   │   ├── repository/                   ✅ DB Sorguları & Mappers
│   │   ├── scheduler/                    ✅ Cron İşleri (Aidat Tahakkuku)
│   │   └── service/                      ✅ İş Mantığı & Servis Katmanı (+ Kapsamlı Unit Testler)
│   ├── migrations/                       ✅ 00001 - 00006 Goose Migration Dosyaları
│   ├── Dockerfile                        ✅ Canlı Üretim Dockerfile (Multi-stage Go + Goose)
│   ├── Dockerfile.dev                    ✅ Geliştirme Dockerfile (Air hot-reload)
│   ├── entrypoint.sh                     ✅ Canlı Başlatıcı & Otomatik Migration
│   ├── sqlc.yaml                         ✅ SQLC Konfigürasyonu
│   └── go.mod / go.sum                   ✅ Go 1.24 Bağımlılıkları
├── frontend/
│   ├── src/
│   │   ├── api/                          ✅ Axios İstemcisi & Endpoint Fonksiyonları
│   │   ├── components/                   ✅ Modallar, Tablolar, UI Bileşenleri (Toast, Sayaç, Rapor)
│   │   ├── pages/                        ✅ Owner, Admin, Resident Dashboard ve Login Sayfaları
│   │   ├── store/                        ✅ Zustand Store'ları (`auth`, `toast` + Unit Testler)
│   │   └── router/                       ✅ React Router v7 & ProtectedRoute
│   ├── Dockerfile                        ✅ Canlı Üretim Dockerfile (Multi-stage Nginx)
│   ├── Dockerfile.dev                    ✅ Geliştirme Dockerfile (Vite)
│   ├── nginx.conf                        ✅ Nginx SPA & Güvenlik Başlıkları
│   ├── package.json                      ✅ Bağımlılıklar (Vitest, React 19, Tailwind v4)
│   └── vite.config.ts                    ✅ Vite Konfigürasyonu (allowedHosts & Proxy)
├── docker-compose.yml                    ✅ Yerel Geliştirme Ortamı (Traefik v3 uyumlu)
├── docker-compose.prod.yml               ✅ Canlı Üretim Ortamı (Traefik v3 + HTTPS + Izole DB)
├── gemini.md                             ✅ Asistan & Proje Kuralları (Feriha)
├── claude.md                             ✅ Senkron Asistan & Proje Kuralları
└── IMPLEMENTATION_PLAN.md                ✅ Güncel Faz Takip Tablosu
```

---

## Çalıştırma Komutları (Referans)

```bash
# Sadece DB'yi ayağa kaldır
docker compose up postgres -d

# Tüm stack (yerel dev)
docker compose --profile app up -d

# Backend testlerini çalıştır
cd backend && go test -v -cover ./...

# Frontend testlerini, linter'ı ve build'i çalıştır
cd frontend && npm run test && npm run lint && npm run build
```
