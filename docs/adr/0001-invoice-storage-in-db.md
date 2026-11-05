# ADR 0001: Fatura ve Fiş Belgelerinin PostgreSQL İçinde (BYTEA) Saklanması

- **Tarih:** 2026-10-25
- **Durum:** Kabul Edildi (Accepted)

---

## 1. Bağlam (Context)

Site yönetim uygulamasında yöneticilerin masraf kayıtlarına (elektrik faturası, asansör bakım makbuzu, temizlik faturası vb.) PDF veya JPEG formatında belge ekleyebilmesi gerekmektedir. Maksimum dosya boyutu 2 MB olarak belirlenmiştir.

Bu belgelerin nerede saklanacağı konusunda üç mimari seçenek değerlendirilmiştir:
1. **Yerel Dosya Sistemi (Local Volume):** Sunucuda bir disk klasörüne yazmak.
2. **Doğrudan Bulut Nesne Depolama (S3 / OCI Object Storage):** Dosyaları uygulama içinden doğrudan harici depolama servisine yüklemek.
3. **Veritabanı İçi İkili Depolama (PostgreSQL BYTEA):** Belgeleri atomik olarak `expense_invoices` tablosunda saklamak.

---

## 2. Karar (Decision)

Fatura ve fiş belgelerinin doğrudan PostgreSQL içinde `expense_invoices` tablosunda `BYTEA` veri tipi ile saklanmasına karar verilmiştir:

- Dosya boyutu katı olarak **2 MB** ile sınırlandırılmıştır (`CHECK (file_size > 0 AND file_size <= 2097152)`).
- Masraf listeleme sorgularında (`ListExpensesBySite`) `BYTEA` kolonu asla çekilmez; yalnızca meta veriler (`invoice_id`, `invoice_file_name`, `invoice_file_size`, `invoice_file_type`) taşınır.
- Binary veri yalnızca kullanıcı faturayı görüntülemek istediğinde (`GET /admin/expenses/{id}/invoice`) veritabanından çekilir ve `inline` HTTP stream edilir.

---

## 3. Sonuçlar ve Avantajlar (Consequences)

### Avantajlar:
- **Sıfır Ek Operasyonel Yük:** Halihazırda çalışan `docker/backup` servisi (günlük `pg_dump` + Oracle Cloud OCI Object Storage yüklemesi) faturayı otomatik olarak yedekler. Ayrı bir S3 bucket senkronizasyonu veya dosya sistemi yedekleme scripti kurmaya gerek kalmamıştır.
- **Felaket Kurtarma Garantisi:** Bir sunucu çöküşünde veya taşınmasında, tek bir `.sql.gz` yedeği geri yüklendiğinde tüm belgeler de eksiksiz geri gelir. Dosya kaybolması veya veritabanı ile disk arasında yetim dosya (orphan file) kalması imkansızdır.
- **Atomik Bütünlük:** Masraf kaydı silindiğinde (`ON DELETE CASCADE`), ilişkili fatura verisi de veritabanı transaction'ı içinde anında temizlenir.

### Göze Alınan Kısıtlar (Trade-offs):
- 2 MB üzeri devasa dosyalar için uygun değildir (ancak apartman yönetiminde fatura/fiş belgeleri zaten 100-500 KB bandındadır).
- Veritabanı dump boyutu artar (gzip sıkıştırması sayesinde bu etki minimum düzeydedir).
