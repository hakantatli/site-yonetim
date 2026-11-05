# Operasyon, Dağıtım ve Felaket Kurtarma (Operations & Runbook)

Bu belge; uygulamanın canlı ortam dağıtımını, Docker mimarisini, Traefik HTTPS entegrasyonunu, CI/CD akışını ve veritabanı yedekleme/kurtarma (disaster recovery) adımlarını açıklar.

---

## 1. Konteyner Mimarisi

Sistem Docker Compose ile yönetilir. İki ayrı ortam konfigürasyonu bulunur:

- **Geliştirme (`docker-compose.yml`):**
  - `postgres`: Yerel 5432 portuna açık PostgreSQL 16.
  - `backend`: Kod değişikliklerinde anında derlenen `air` hot-reload konteyneri.
  - `frontend`: Vite dev server (HMR destekli).
  - `pgadmin`: Geliştirme veritabanı yönetim arayüzü (`localhost:5050`).
- **Canlı Ortam (`docker-compose.prod.yml`):**
  - `postgres`: Sadece iç ağa (`default`) bağlı, dış dünyaya kapalı PostgreSQL 16.
  - `backend`: Minimal Alpine tabanlı, `CGO_ENABLED=0` ile derlenmiş tek ikili (binary) servis.
  - `frontend`: Nginx Alpine üzerinde statik derlenmiş SPA dosyaları.
  - `backup`: Alpine `postgresql16-client` tabanlı otomatik cron yedekleme servisi.
  - `traefik_webgateway`: Dış dünyadan gelen 80/443 HTTPS trafiğini yönlendiren ana ters vekil (reverse proxy).

---

## 2. Sıfır Kesintili Dağıtım (Zero-Downtime Deployment)

Canlı ortamda deployment yapılırken sitenin kapalı kalmasını (downtime) önlemek için **kesinlikle `docker compose down` komutu kullanılmaz.**

### Doğru Dağıtım Sırası:
1. Mevcut çalışan konteynerlere dokunmadan yeni imajlar arka planda derlenir:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml build
   ```
2. Yeni konteynerler anında ayağa kaldırılır ve eski konteynerler kesintisiz değiştirilir:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans
   ```

---

## 3. GitHub Actions CI/CD Hattı

Hattın çalışması `self-hosted` runner üzerindedir:

### In-Place Git Senkronizasyonu
Self-hosted runner'larda `actions/checkout@v4` kullanıldığında, `root` yetkisiyle üretilen yedek dosyaları (`backup/*.sql.gz`) `ubuntu` kullanıcısı tarafından silinemeyerek `EACCES: permission denied, unlink` hatasına yol açar. Bu nedenle runner üzerinde **In-Place Git Reset** deseni uygulanır:

```bash
if [ ! -d .git ]; then
  git init
  git remote add origin "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
else
  git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
fi
git fetch --depth=1 origin main
git reset --hard origin/main
```

### Kalite Kapıları
Pipeline şu üç aşamayı başarıyla geçmeden canlıya kod çıkarmaz:
1. **Frontend Tests & Build:** `oxlint` linter, `vitest` birim testleri ve `vite build` derlemesi.
2. **Backend Tests:** `go vet` statik analizi ve `go test -race` yarış durumu (race condition) testleri.
3. **Deploy to Server:** Kod senkronizasyonu, pre-deployment veritabanı yedeği ve Docker Compose dağıtımı.

---

## 4. Veritabanı Yedekleme ve Kurtarma Runbook'u (Disaster Recovery)

### Otomatik Cron Yedekleme
- `docker/backup` servisi her gece saat `01:00`'de (`TZ=Europe/Istanbul`) çalışır.
- `pg_dump` aracılığıyla `--clean --if-exists --no-owner --no-privileges` parametreleriyle veritabanını gzip sıkıştırmalı (`.sql.gz`) olarak yerel `./backup` dizinine kaydeder.
- **Rotasyon (Retention):** Yalnızca en güncel 15 yedek saklanır (`MAX_BACKUPS=15`), eski dosyalar otomatik silinir.
- **Bulut Yedekleme (Oracle Cloud OCI):** `OCI_BACKUP_PAR_URL` ortam değişkeni tanımlıysa, alınan her yedek eşzamanlı olarak Oracle Cloud Object Storage Standard Bucket'a güvenle yüklenir.

### Manuel Yedek Alma Komutu
Acil bir işlem veya bakım öncesinde elle anlık yedek almak için:
```bash
docker compose -f docker-compose.prod.yml exec backup /backup.sh
```

### Pre-Deployment Yedekleme
Canlı sunucuda yeni bir sürüm veya migration devreye alınmadan önce mutlaka anlık veritabanı yedeği alınmalıdır:
```bash
# Otomatik backup scripti tetiklenir
docker compose -f docker-compose.prod.yml exec backup /backup.sh
```

### Tek Komutla Veritabanı Geri Yükleme (Restore)
Olası bir veri bozulması veya hatalı işlem anında yedekten geri dönmek için:
```bash
docker compose -f docker-compose.prod.yml exec backup /restore.sh /backup/YYYYMMDDHHMM.binaportal.sql.gz
```
Script mevcut bağlantıları güvenle sonlandırır, veritabanını temizler ve seçilen yedeği sıfır kayıpla geri yükler.

---

## 5. Canlı İzleme ve Operasyonel Kurallar

- Sunucu durumunu veya deployment adımlarını kontrol etmek için canlı sunucuya doğrudan SSH ile bağlanıp komut çalıştırmak yerine kontroller **GitHub CLI (`gh`)** üzerinden yapılmalıdır:
  ```bash
  gh run list --limit 5
  gh run watch <run-id>
  gh run view <run-id> --log-failed
  ```
- **Katı Kural:** Yapılan değişiklikler lokalde commit edilebilir; ancak kullanıcı açıkça onay ("pushla") vermeden kesinlikle `git push` yapılmaz.
