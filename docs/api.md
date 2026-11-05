# REST API Sözleşmesi ve Rota Dokümantasyonu (API)

Bu belge, Site Yönetim Uygulamasının HTTP REST API sözleşmesini, yetkilendirme modelini ve endpoint listesini içerir.

---

## 1. Temel Standartlar

- **Base URL:** `/api/v1`
- **İçerik Türü (Content-Type):** Standart istekler için `application/json`; dosya yüklemeli masraf kayıtları için `multipart/form-data`.
- **Kimlik Doğrulama:**
  - Header: `Authorization: Bearer <access_token>`
  - Dosya indirme / yeni sekme önizleme (PDF/JPEG): Query Param `?token=<access_token>`
- **Standart Hata Formatı:**
  ```json
  {
    "error": "Açıklayıcı hata mesajı"
  }
  ```
- **HTTP Durum Kodları:**
  - `200 OK` / `201 Created`: Başarılı istekler.
  - `400 Bad Request`: Eksik veya geçersiz parametre / validasyon hatası.
  - `401 Unauthorized`: Token eksik, geçersiz veya süresi dolmuş.
  - `403 Forbidden`: Kullanıcının yetkisi yok veya başka bir sitenin verisine erişmeye çalışıyor.
  - `404 Not Found`: İstenen kayıt bulunamadı.
  - `500 Internal Server Error`: Beklenmeyen sunucu hatası.

---

## 2. Kimlik Doğrulama Rotaları (`/api/v1/auth`)

| Metot | Rota | Yetki | Açıklama |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Telefon (veya e-posta) + şifre ile giriş yapar. Access & refresh token döner. |
| `POST` | `/auth/refresh` | Public | Refresh token ile yeni access token üretir. |
| `POST` | `/auth/logout` | Public | Refresh token'ı iptal eder ve oturumu sonlandırır. |
| `POST` | `/auth/change-password` | Protected | Kullanıcının kendi şifresini değiştirmesini sağlar. |

---

## 3. Sistem Sahibi Rotaları (`/api/v1/owner`)

Yalnızca `owner` rolündeki kullanıcılar erişebilir:

| Metot | Rota | Açıklama |
|---|---|---|
| `GET` | `/owner/sites` | Tüm siteleri, daire sayılarını ve limit durumlarını listeler. |
| `POST` | `/owner/sites` | Yeni bir site oluşturur (Varsayılan 10 daire limitiyle). |
| `GET` | `/owner/sites/{id}` | Seçilen sitenin genel detaylarını döner. |
| `PATCH` | `/owner/sites/{id}` | Sitenin adını, adresini veya daire limitini günceller. |
| `POST` | `/owner/sites/{id}/admin` | Seçilen siteye yeni bir Site Yöneticisi atar/ekler. |

---

## 4. Yönetici Rotaları (`/api/v1/admin` veya `/api/v1/sites/{siteID}/admin`)

`admin` veya `owner` rolündeki kullanıcılar erişebilir:

### Daire ve Sakin Yönetimi
- `GET /admin/apartments`: Sitedeki aktif daireleri ve sakinlerini listeler.
- `POST /admin/apartments`: Yeni daire ekler (10 daire limit kontrolü uygulanır).
- `GET /admin/apartments/{id}`: Daire detayını ve sakin geçmişini getirir.
- `PATCH /admin/apartments/{id}`: Daire bilgilerini günceller (`is_due_exempt`, kapı no vb.).
- `DELETE /admin/apartments/{id}`: Daireyi soft-delete ile pasife alır.
- `POST /admin/apartments/{id}/tenant`: Daireye yeni kiracı atar (önceki kiracının borç transfer aksiyonu ile: leave, transfer, delete).
- `DELETE /admin/apartments/{id}/tenant`: Dairedeki aktif kiracıyı tahliye eder.
- `GET /admin/apartments/blocks`: Sitede tanımlı blok isimlerini listeler.

### Aidat ve Borçlandırma
- `GET /admin/dues/rates`: Sitenin mevcut aidat tutarını ve geçmiş değişimlerini listeler.
- `POST /admin/dues/rates`: Yeni aidat tutarı belirler (geçerlilik tarihi seçimiyle).
- `POST /admin/dues/trigger-accrual`: İçinde bulunulan ay için manuel aidat tahakkukunu tetikler.
- `GET /admin/debts`: Sitedeki borç kayıtlarını listeler (filtreleme: daire, sakin, durum, tip).
- `POST /admin/debts/manual`: Tek bir daireye özel borç kaydı açar.
- `POST /admin/debts/bulk`: Tüm aktif dairelere toplu borç yansıtır (demirbaş veya tadilat).

### Tahsilat (Ödemeler)
- `GET /admin/payments`: Sitede yapılan tahsilatları listeler.
- `POST /admin/payments`: Manuel tahsilat kaydeder (kısmi/fazla ödeme otomatik işlenir).
- `GET /admin/payments/stats`: Tahsilat toplamlarını döner.
- `DELETE /admin/payments/{id}`: Tahsilat kaydını iptal eder/siler.

### Masraflar ve Fatura Belgeleri
- `GET /admin/expense-categories`: Masraf kategorilerini listeler.
- `POST /admin/expense-categories`: Yeni masraf kategorisi ekler.
- `PATCH /admin/expense-categories/{id}`: Kategori adını günceller.
- `DELETE /admin/expense-categories/{id}`: Kategoriyi siler (bağlı masraf varsa pasife alır).
- `GET /admin/expenses`: Masrafları filtreli listeler (`category_id`, tarih aralığı).
- `POST /admin/expenses`: Yeni masraf kaydeder (`multipart/form-data` ile opsiyonel PDF/JPEG fatura yüklenebilir).
- `GET /admin/expenses/{id}/invoice`: Masrafa ait fatura belgesini inline stream eder.
- `DELETE /admin/expenses/{id}`: Masraf kaydını ve bağlı faturasını siler.

### Sayaç Okuma & Tüketim Dağıtımı
- `GET /admin/meters/types`: Sayaç türlerini listeler (Su, Elektrik, Doğal Gaz).
- `POST /admin/meters/types`: Yeni sayaç türü tanımlar.
- `GET /admin/meters/periods`: Geçmiş fatura dağıtım dönemlerini listeler.
- `POST /admin/meters/periods`: Yeni dönem açar, ana sayaç ve daire sayaçlarını girip otomatik borç dağıtır.
- `GET /admin/meters/periods/{id}`: Dönem detayını (daire endeksleri, ücretleri, önceki borçları) döner.
- `DELETE /admin/meters/periods/{id}`: Sayaç dönemini ve ürettiği borç kayıtlarını iptal eder.

### Şeffaf Kasa & Duyurular
- `GET /admin/treasury`: Toplam gelir, toplam gider, açılış bakiyesi ve net kasa özetini döner.
- `PATCH /admin/treasury/initial-balance`: Kasa açılış devir bakiyesini günceller.
- `GET /admin/announcements`: Duyuruları listeler.
- `POST /admin/announcements`: Yeni duyuru yayınlar.
- `PATCH /admin/announcements/{id}`: Duyuruyu günceller.
- `DELETE /admin/announcements/{id}`: Duyuruyu siler.

---

## 5. Sakin Rotaları (`/api/v1/resident`)

`resident`, `admin` veya `owner` rolündeki kullanıcılar erişebilir:

| Metot | Rota | Açıklama |
|---|---|---|
| `GET` | `/resident/dashboard` | Sakinin bağlı olduğu dairenin bakiye, son borç ve ödeme özetini döner. |
| `GET` | `/resident/debts` | Sakinin kendi dairesine ait borçları listeler. |
| `GET` | `/resident/payments` | Sakinin kendi geçmiş ödeme dökümünü listeler. |
| `GET` | `/resident/treasury` | Sitenin şeffaf kasa gelir-gider ve net bakiye özetini döner. |
| `GET` | `/resident/announcements` | Sitenin aktif duyurularını görüntüler. |
| `GET` | `/resident/meters/periods` | Sitenin geçmiş sayaç fatura dağıtım dönemlerini görüntüler. |
| `GET` | `/resident/meters/periods/{id}` | Kendi dairesinin tüketimini, birim fiyatı ve bina ortak alan payını şeffafça inceler. |
