# Sistem Mimarisi (Architecture)

Bu belge, Site Yönetim Uygulamasının (Bina Portal) genel sistem mimarisini, monorepo organizasyonunu, katmanlar arası veri akışını ve güvenlik modelini açıklar.

---

## 1. Genel Bakış ve Teknoloji Yığını

Uygulama, monorepo çatısı altında bağımsız iki ana modülden oluşur:

- **Backend:** Go 1.22+ tabanlı, harici framework şişkinliği içermeyen, RESTful API servisi (`backend/`).
  - Yönlendirme (Routing): `chi/v5`
  - Veri Tabanı Sürücüsü: `pgx/v5` ve `pgxpool`
  - Tip Güvenli Veri Erişimi: `sqlc`
  - Veritabanı Migrasyonları: `goose/v3`
  - Zamanlanmış Görevler: `robfig/cron/v3`
  - Yapısal Loglama: Go standart kütüphanesi `slog`
- **Frontend:** React 19 ve TypeScript tabanlı Tek Sayfa Uygulama (SPA) (`frontend/`).
  - Derleme Aracı: `Vite`
  - Sayfa Yönlendirme: `react-router-dom` (v7)
  - Sunucu Durumu & Önbellek: `@tanstack/react-query`
  - İstemci Durumu: `zustand`
  - Stil ve Tasarım: `Tailwind CSS`
  - İkon Kütüphanesi: `lucide-react`
- **Altyapı & Dağıtım:**
  - Konteynerleştirme: Docker & Docker Compose
  - Reverse Proxy & SSL: Traefik (Let's Encrypt entegrasyonlu)
  - Veritabanı: PostgreSQL 16 (Alpine tabanlı)
  - Otomatik Yedekleme: `docker/backup` servisi (günlük pg_dump + OCI Object Storage)

---

## 2. Monorepo Dizin Yapısı

```
site-yonetim/
├── backend/
│   ├── cmd/
│   │   ├── server/       # HTTP API ana giriş noktası (main.go)
│   │   └── seed/         # Demo ve başlangıç verisi tohumlama aracı
│   ├── internal/
│   │   ├── config/       # Çevresel değişkenler ve konfigürasyon
│   │   ├── domain/       # Saf veri modelleri, DTO'lar ve hata tipleri
│   │   ├── handler/      # HTTP taşıma katmanı (REST endpoints)
│   │   ├── middleware/   # Auth, rol kontrolü, site izolasyonu, logging, rate limit
│   │   ├── repository/   # Veritabanı sorguları ve sqlc adaptörleri
│   │   ├── scheduler/    # Otomatik aidat tahakkuku cron scheduler'ı
│   │   └── service/      # Çekirdek iş mantığı ve domain validasyonları
│   └── migrations/       # Goose SQL migrasyon dosyaları
├── frontend/
│   ├── src/
│   │   ├── api/          # Backend REST API istemcileri (axios)
│   │   ├── components/   # Yeniden kullanılabilir UI bileşenleri ve modallar
│   │   ├── pages/        # Sayfa yerleşimleri (admin, resident, owner, auth)
│   │   ├── store/        # Zustand global durum yönetimi (auth, toast)
│   │   ├── types/        # TypeScript arayüz ve tip tanımları
│   │   └── utils/        # Telefon, tarih ve biçimlendirme yardımcıları
├── docker/
│   └── backup/           # Günlük yedekleme, rotasyon ve OCI upload scriptleri
├── docs/                 # Proje teknik dokümantasyonu
├── docker-compose.yml    # Geliştirme ortamı Compose konfigürasyonu
└── docker-compose.prod.yml # Canlı ortam Compose konfigürasyonu
```

---

## 3. Backend Katmanlı Mimari (Clean Layered Architecture)

Backend, tek yönlü bağımlılık ilkesine dayanan katı bir katman hiyerarşisi uygular:

```
[ HTTP İstekleri ]
       │
       ▼
[ Transport / Handler Katmanı ]  (internal/handler)
  - HTTP request parsing, JSON decode, multipart form handling
  - Erken validasyon ve guard clause kontrolleri
       │
       ▼
[ Servis Katmanı ]               (internal/service)
  - Saf iş mantığı, domain kuralları, finansal hesaplamalar
  - Veritabanı transaction koordinasyonu
       │
       ▼
[ Veri Erişim Katmanı ]          (internal/repository)
  - SQLC generated queries, pgxpool yönetimi
  - Veritabanı tiplerinin (pgtype) domain modellerine dönüştürülmesi
       │
       ▼
[ PostgreSQL Veritabanı ]
```

### Katman Sınır Kuralları

1. **Handler Asla Veritabanına Erişmez:** Handler metotları yalnızca ilgili Servis arayüzünü (`service.ApartmentService`, `service.ExpenseService` vb.) çağırır.
2. **Servis Katmanı HTTP Bilmez:** Servis katmanı `net/http`, `chi.Router` veya HTTP durum kodlarını import etmez; yalnızca standart Go tipleri ve `internal/domain` modelleriyle çalışır.
3. **Domain Katmanı Bağımsızdır:** `internal/domain` paketinin dışındaki hiçbir pakete bağımlılığı yoktur; saf struct ve interface tanımlarından ibarettir.

---

## 4. Kimlik Doğrulama & Yetkilendirme (Auth & Multitenancy)

### JWT Mimarisi

- **Access Token:** 15 dakika geçerlilik süresine sahiptir. Payload içeriğinde `user_id`, `phone`, `role` ve `site_id` bilgileri taşınır.
- **Refresh Token:** 7 gün geçerlilik süresine sahiptir. Veritabanındaki `refresh_tokens` tablosunda SHA-256 hash'lenmiş olarak saklanır; çıkış yapıldığında veya yenilendiğinde veritabanından iptal edilir (revocation list).
- **Şifreleme Güvenliği:** Kullanıcı şifreleri veritabanında düz metin olarak tutulmaz; daima `bcrypt` algoritması ile hashlenerek saklanır.

### Çok Kiracılı Veri İzolasyonu (Multi-Tenant Isolation)

Sistemde 3 temel kullanıcı rolü bulunur:

1. **Owner (Sistem Sahibi):** En üst seviye rol. Tüm sitelere erişebilir, yeni site oluşturabilir ve site yöneticisi atayabilir.
2. **Site Yöneticisi (Admin):** Yalnızca sorumlu olduğu `site_id`'ye ait daireleri, sakinleri, borçları, sayaçları, masrafları ve duyuruları yönetir.
3. **Sakin (Resident - Kat Maliki / Kiracı):** Yalnızca kendi dairesine ait borç ve ödemeleri; ayrıca sitenin şeffaf kasa özetini ve duyurularını görüntüleyebilir.

İzolasyon iki aşamalı bir middleware zinciriyle güvenceye alınır:

- **`AuthMiddleware`:** İstek başlığındaki `Authorization: Bearer <token>` veya dosya önizlemeleri için URL query parametresindeki `?token=<token>` değerini doğrular, claims bilgisini request context'ine yazar.
- **`SiteIsolationMiddleware`:** URL'de `/sites/{siteID}/*` rotası çağrıldığında, istek yapan kullanıcının rolü `owner` değilse context'teki `site_id` ile URL'deki `siteID`'nin birebir eşleştiğini doğrular. Eşleşmiyorsa işlem `403 Forbidden` ile erken reddedilir.

---

## 5. Frontend Durum ve Ağ Mimarisi

- **API İstemcisi (`api/client.ts`):** Axios instance'ı oluşturulur. İsteklere otomatik olarak `Authorization: Bearer <access_token>` başlığı eklenir.
- **Şeffaf Token Yenileme (Silent Token Refresh):** API'den `401 Unauthorized` yanıtı geldiğinde, Axios response interceptor gelen eşzamanlı istekleri bir kuyrukta (`failedQueue`) bekletir, `/auth/refresh` endpoint'ine arka planda istek atarak yeni access token alır, bekleyen tüm istekleri yeni token ile tekrar çalıştırır. Refresh token da geçersizse oturum sonlandırılır.
- **Veri Senkronizasyonu (`@tanstack/react-query`):** Tüm liste ve detay verileri (daireler, borçlar, sayaçlar, masraflar) React Query query cache'inde saklanır. Bir ekleme/düzenleme/silme mutasyonu gerçekleştiğinde ilgili query key'ler `invalidateQueries` ile bayatlatılarak arayüz anında güncellenir.
