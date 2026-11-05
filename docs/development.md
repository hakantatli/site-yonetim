# Geliştirme Ortamı ve Kurulum Rehberi (Development)

Bu belge, projeyi sıfırdan bir geliştirici makinesinde 5 dakika içinde çalışır hale getirmek için gereken adımları, demo hesaplarını ve test komutlarını içerir.

---

## 1. Ön Koşullar

- **Go:** 1.22 veya üzeri
- **Node.js:** 20 veya üzeri (veya npm 10+)
- **Docker & Docker Compose:** Konteynerleri ve yerel PostgreSQL'i çalıştırmak için
- *(Opsiyonel)* `sqlc` (`go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`)
- *(Opsiyonel)* `goose` (`go install github.com/pressly/goose/v3/cmd/goose@latest`)

---

## 2. Adım Adım Lokal Kurulum

### Adım 1: Ortam Değişkenlerini Hazırlama
Proje kök dizininde bulunan `.env.example` dosyasını `.env` olarak kopyalayın:
```bash
cp .env.example .env
```

### Adım 2: Veritabanını Başlatma
Yalnızca PostgreSQL servisini arka planda ayağa kaldırın:
```bash
docker compose up -d postgres
```
Veritabanı `localhost:5432` portunda `site_user` / `site_pass` / `site_yonetim` bilgileriyle hazır hale gelecektir.

### Adım 3: Demo Verilerini Tohumlama (Seed)
Backend otomatik olarak Goose migrasyonlarını çalıştıracak şekilde yapılandırılmıştır. Demo sitesini ve senaryoları yüklemek için:
```bash
cd backend
go run ./cmd/seed
```
Bu komut; 10 daireli "Çınar Park Sitesi"ni, yönetici ve sakin kullanıcılarını, aidat geçmişini ve örnek elektrik faturası dağıtımını sisteme yazar.

### Adım 4: Backend API Servisini Çalıştırma
```bash
cd backend
go run ./cmd/server
```
Backend API `http://localhost:8080/api/v1` adresinde dinlemeye başlar.

### Adım 5: Frontend Uygulamasını Çalıştırma
Yeni bir terminal sekmesinde:
```bash
cd frontend
npm install
npm run dev
```
Frontend Tek Sayfa Uygulaması `http://localhost:5173` adresinde açılır.

---

## 3. Hazır Demo Giriş Bilgileri

Giriş ekranında bulunan "Demo Girişi" kısayollarını kullanabilir veya şu kimlik bilgileriyle oturum açabilirsiniz:

| Rol | Kullanıcı | Telefon Numarası | Şifre |
|---|---|---|---|
| **Sistem Sahibi (Owner)** | Hakan Tatlı | `0500 000 00 00` | `AdminPassword123!` |
| **Site Yöneticisi (Admin)** | Çınar Park Yöneticisi | `0555 123 45 67` | `Demo1234!` |
| **Sakin (Kiracı)** | Can Arslan (A Blok No: 2) | `0542 301 00 01` | `Demo1234!` |

---

## 4. Test ve Kalite Komutları

Geliştirilen kodların doğruluğunu onaylamak için aşağıdaki komut setlerini kullanın:

### Backend Testleri
```bash
# Yarış durumu (race detector) ile tüm birim ve servis testlerini koşturun
cd backend
go test -v -race ./...

# Go vet statik kod analizini çalıştırın
go vet ./...
```

### Frontend Testleri ve Derleme
```bash
cd frontend

# Birim testleri (vitest)
npm test -- --run

# Oxlint linter kontrolü
npx oxlint

# TypeScript tip kontrolü ve üretim derlemesi
npm run build
```
