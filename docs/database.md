# Veritabanı ve Şema Dokümantasyonu (Database)

Bu belge, PostgreSQL 16 veritabanı şemasını, migrasyon döngüsünü, SQLC sorgu modelini ve veri bütünlüğü kurallarını detaylandırır.

---

## 1. Veritabanı Mimarisi ve Araçlar

- **Veritabanı Motoru:** PostgreSQL 16 (Alpine tabanlı konteyner).
- **Migrasyon Aracı:** `goose` (SQL tabanlı çift yönlü migrasyonlar, `backend/migrations/`).
- **Sorgu Oluşturucu:** `sqlc` (Tip güvenli Go kod üretimi, `backend/internal/repository/db/`).
- **Bağlantı Havuzu:** `pgxpool` (`github.com/jackc/pgx/v5/pgxpool`).

---

## 2. Migrasyon Geçmişi (Migration History)

| No | Dosya Adı | Açıklama |
|---|---|---|
| `00001` | `00001_initial_schema.sql` | 12 temel tablo ve 2 analitik view (`debt_summary`, `monthly_cashflow`). |
| `00002` | `00002_phone_mandatory_email_optional.sql` | Sakinler için telefon numarası tekil ve zorunlu, e-posta opsiyonel yapıldı. |
| `00003` | `00003_fix_empty_email_index.sql` | Boş e-postalar için partial unique index tanımlandı. |
| `00004` | `00004_fix_debt_summary_remaining.sql` | Kısmi ve fazla ödemeleri doğru hesaplayan view güncellemesi. |
| `00005` | `00005_add_initial_balance_to_sites.sql` | Sitelere kasa açılış/devir bakiyesi (`initial_balance`) kolonu eklendi. |
| `00006` | `00006_add_meter_reading_and_consumption_billing.sql` | `meter_types`, `consumption_periods` ve `meter_readings` tabloları eklendi. |
| `00007` | `00007_add_is_due_exempt_to_apartments.sql` | Dairelere aidat muafiyet bayrağı (`is_due_exempt`) eklendi. |
| `00008` | `00008_add_must_change_password_to_users.sql` | İlk girişte şifre değiştirme bayrağı (`must_change_password`) eklendi. |
| `00009` | `00009_add_expense_invoices.sql` | Masraf fatura ve fişleri için `expense_invoices` (BYTEA) tablosu eklendi. |

---

## 3. Temel Tablolar ve İlişkiler

### 1. `sites` (Siteler)
- `id (UUID, PK)`
- `name (TEXT, UNIQUE)`
- `address (TEXT)`
- `apartment_limit (INT, DEFAULT 10)` — Freemium sınır kontrolü
- `initial_balance (NUMERIC(12,2), DEFAULT 0)` — Kasa açılış devir bakiyesi
- `is_active (BOOLEAN, DEFAULT TRUE)`

### 2. `users` (Kullanıcılar)
- `id (UUID, PK)`
- `site_id (UUID, FK -> sites, NULLable)` — Owner için boştur, yönetici ve sakinler bağlıdır
- `role (TEXT)` — `owner`, `admin`, `resident`
- `full_name (TEXT)`
- `phone (TEXT, UNIQUE)` — Zorunlu tekil giriş alanı
- `email (TEXT)` — Opsiyonel
- `password_hash (TEXT)` — bcrypt hash
- `must_change_password (BOOLEAN, DEFAULT FALSE)`

### 3. `apartments` (Daireler)
- `id (UUID, PK)`
- `site_id (UUID, FK -> sites)`
- `block_id (UUID, FK -> blocks, NULLable)`
- `apartment_number (TEXT)`
- `owner_user_id (UUID, FK -> users, NULLable)` — Kat maliki
- `tenant_user_id (UUID, FK -> users, NULLable)` — Aktif kiracı
- `is_due_exempt (BOOLEAN, DEFAULT FALSE)` — Aidat muafiyeti
- `is_active (BOOLEAN, DEFAULT TRUE)` — Soft-delete bayrağı

### 4. `due_rates` (Aidat Tutarları & Geçerlilik)
- `id (UUID, PK)`
- `site_id (UUID, FK -> sites)`
- `amount (NUMERIC(10,2))`
- `valid_from (DATE)` — Hangi tarihten itibaren geçerli olduğu

### 5. `debts` (Borç Tahakkukları)
- `id (UUID, PK)`
- `site_id (UUID, FK -> sites)`
- `apartment_id (UUID, FK -> apartments)`
- `debtor_user_id (UUID, FK -> users)` — Borcun muhatabı (kiracı veya ev sahibi)
- `amount (NUMERIC(10,2))`
- `type (TEXT)` — `due` (aidat), `fixture` (demirbaş), `utility` (sayaç/fatura), `other`
- `status (TEXT)` — `unpaid`, `partial`, `paid`
- `due_month (DATE)`
- `description (TEXT)`

### 6. `payments` (Tahsilatlar)
- `id (UUID, PK)`
- `site_id (UUID, FK -> sites)`
- `debt_id (UUID, FK -> debts)`
- `apartment_id (UUID, FK -> apartments)`
- `debtor_user_id (UUID, FK -> users)`
- `amount (NUMERIC(10,2))`
- `payment_method (TEXT)` — `cash`, `bank_transfer`, `other`
- `paid_at (TIMESTAMPTZ)`
- `notes (TEXT)` — Kısmi (`[Eksik Ödeme...]`) veya fazla (`[Fazla Ödeme...]`) notları

### 7. `expenses` & `expense_invoices` (Masraflar ve Fatura Belgeleri)
- `expenses`: Masraf tutarı, harcama tarihi, kategori (`category_id`), açıklama, makbuz no.
- `expense_invoices`:
  - `id (UUID, PK)`
  - `expense_id (UUID, UNIQUE, FK -> expenses ON DELETE CASCADE)`
  - `file_name (TEXT)`, `file_type (TEXT)`, `file_size (INT)`
  - `file_data (BYTEA)` — Maksimum 2 MB binary veri

### 8. `consumption_periods` & `meter_readings` (Sayaç Okuma ve Dağıtım)
- `consumption_periods`: Dönem (YYYY-MM), ana sayaç ilk/son endeks, toplam tüketim, fatura tutarı, birim fiyat, ortak alan payı.
- `meter_readings`: Daire bazlı ilk/son endeks, bireysel tüketim, bireysel pay, üretilen borç kaydı (`debt_id`).

---

## 4. Analitik Görünümler (Views)

### `debt_summary`
Her borç kaydının yapılan tahsilatlarla netleştirilmiş güncel bakiyesini hesaplar:
- `paid_amount = COALESCE(SUM(payments.amount), 0)`
- `remaining = GREATEST(0, debts.amount - paid_amount)`

### `monthly_cashflow`
Şeffaf kasa dökümü için ay bazında toplam tahsilatları, toplam masrafları ve net aylık nakit akışını gruplar.

---

## 5. SQLC İş Akışı

Sorgular `backend/internal/repository/queries/*.sql` dizininde tanımlanır:

```bash
cd backend
sqlc generate
```

- Çıktılar `backend/internal/repository/db/` dizinine otomatik olarak tip güvenli Go kodları olarak üretilir.
- Üretilen dosyalara manuel müdahale edilmez; değişiklikler SQL dosyasında yapılıp `sqlc generate` çalıştırılır.
