# ADR 0003: Self-Hosted Runner Üzerinde In-Place Git Senkronizasyonu

- **Tarih:** 2026-10-25
- **Durum:** Kabul Edildi (Accepted)

---

## 1. Bağlam (Context)

Canlı sunucuda çalışan GitHub Actions `self-hosted` runner, Docker tabanlı üretim ortamıyla aynı host makinede bulunmaktadır.

Docker üzerinde çalışan `backup` servisi, gece cron görevlerinde `./backup/` klasörüne `root` kullanıcı yetkileriyle `.sql.gz` dosyaları yazar. Standart `actions/checkout@v4` aksiyonu çalıştırıldığında, çalışma dizinini `ubuntu` kullanıcısıyla temizlemeye (`clean: true`) çalışır. Bu durum, `ubuntu` kullanıcısının `root` tarafından oluşturulan yedek dosyalarını silememesine ve pipeline'ın şu hatayla kırılmasına neden olur:
```
Error: EACCES: permission denied, unlink '/.../backup/202610110100.binaportal.sql.gz'
```

Ayrıca `actions/checkout` başarısız olduğunda bazen `.git` klasörünü silip çalışma dizinini dolu bırakmakta; bu da standart `git clone .` komutunun `destination path already exists and is not an empty directory` hatası vermesine yol açmaktadır.

---

## 2. Karar (Decision)

1. Self-hosted deployment aşamasında `actions/checkout@v4` aksiyonu tamamen kaldırılmıştır.
2. Yerine yerinde (in-place) çalışan, dizin temizliği yapmayan ve yalnızca git farklarını çeken bir kabuk adımı (`Update Code`) eklenmiştir:
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
3. Ek güvence olarak `docker/backup/backup.sh` içinde oluşturulan tüm yedek dosyalarına ve `./backup` klasörüne `chmod 666 / 777` izinleri verilmiştir.

---

## 3. Sonuçlar (Consequences)

### Avantajlar:
- Self-hosted runner üzerinde hiçbir dosya silme veya yetki çakışması (`EACCES`) yaşanmaz.
- CI/CD hattı her push işleminde hatasız ve deterministik biçimde çalışır.
- Yalnızca son commit fetch edildiği için (`--depth=1`) kod güncelleme adımı 2 saniyede tamamlanır.

### Göze Alınan Kısıtlar:
- Runner çalışma alanında `.gitignore` kapsamındaki dosyalar (ör. `.env`, `./backup/`) korunur; repo dışı geçici çöpler otomatik silinmez (ancak üretimde `.env` dosyasının korunması zaten istenen bir davranıştır).
