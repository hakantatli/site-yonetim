# Site Yönetim Uygulaması — Dokümantasyon İndeksi

Bu dizin, Site Yönetim Uygulamasının (Bina Portal) mimari, teknik, operasyonel ve iş mantığı dokümantasyonunu içerir. Dokümantasyon yapısı **Diátaxis Framework** ve **ADR (Architecture Decision Records)** standartlarına göre organize edilmiştir.

---

## Dokümantasyon Haritası

### 1. Açıklayıcı ve Mimari Belgeler (Explanation)
- [architecture.md](architecture.md): Monorepo yapısı, Go backend katmanları, React frontend organizasyonu, JWT auth akışı ve multi-tenant site izolasyonu.
- [business-logic.md](business-logic.md): Aidat hesaplama kuralları, yönetici aidat muafiyeti (`is_due_exempt`), sayaç okuma ve tüketim dağıtım formülleri, kısmi/fazla ödeme toleransı, kiracı değişimi ve şeffaf kasa devir bakiyesi mantığı.

### 2. Teknik Referanslar (Reference)
- [database.md](database.md): PostgreSQL 16 şeması, temel tablolar, `debt_summary` ve `monthly_cashflow` görünümleri (views), Goose migrasyonları ve SQLC iş akışı.
- [api.md](api.md): REST API rotaları (`/auth`, `/owner`, `/admin`, `/resident`), rol bazlı yetkilendirme matrisi, istek/yanıt formatları ve hata kodları.

### 3. Nasıl Yapılır & Operasyon Kılavuzları (How-To)
- [operations.md](operations.md): Docker Compose canlı ortam mimarisi, Traefik HTTPS, CI/CD self-hosted runner yapısı, sıfır kesintili (zero-downtime) deploy sırası ve felaket kurtarma / yedekleme (backup & restore) runbook'u.

### 4. Eğitim & Başlangıç (Tutorial)
- [development.md](development.md): 5 dakikada lokal geliştirme ortamını kurma, PostgreSQL başlatma, demo verilerini tohumlama (seed), hazır giriş hesapları ve test komutları.

### 5. Mimari Karar Kayıtları (Architecture Decision Records)
- [adr/0001-invoice-storage-in-db.md](adr/0001-invoice-storage-in-db.md): Fatura ve makbuz belgelerinin disk yerine PostgreSQL içinde (`BYTEA`) saklanması kararı.
- [adr/0002-meter-distribution-rounding.md](adr/0002-meter-distribution-rounding.md): Sayaç tüketim dağıtımında daire borçlarının tam sayıya yuvarlanması ve kuruş denkliğinin ortak alana yansıtılması.
- [adr/0003-in-place-runner-deployment.md](adr/0003-in-place-runner-deployment.md): Self-hosted runner üzerinde yetki çakışmalarını önleyen in-place git senkronizasyonu kararı.
