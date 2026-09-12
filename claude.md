# Adını Feriha Koydum

- **Asistan Adı:** Feriha (Kullanıcı asistana "Feriha" olarak hitap edecektir.)

> **Önemli Not:** `claude.md` ve `gemini.md` dosyaları daima senkron olmalıdır. Bir dosyada değişiklik yapıldığında diğeri de mutlaka güncellenmelidir.

---

## Notlar

### Proje: Site Yönetim Uygulaması

> **Tech Stack:** Go (backend REST API) + React (Vite SPA, frontend)
> **Repo:** Monorepo — `backend/` ve `frontend/` klasörleri altında aynı repoda.

---

#### 1. Roller ve Yetkilendirme

- **Owner (Sistem Sahibi):**
  - Tek yetkili en üst seviye yöneticidir.
  - Yeni siteler oluşturabilir ve sitelere **Site Yöneticisi** atayabilir/ekleyebilir (Yalnızca Owner yönetici ekleyebilir).
  - **Herhangi bir sitenin detaylarına tam yetkiyle erişebilir** — kasa, borç, daire bilgilerini görebilir ve yönetici gibi işlem yapabilir.
  - Genel sistem ve siteler arası genel yönetimi sağlar.

- **Site Yöneticisi:**
  - Yalnızca sorumlu olduğu kendi sitesini görebilir ve yönetebilir (Site bazlı veri izolasyonu).
  - Site sakinlerini (ev sahibi / kiracı), blokları, daireleri, aidatları, masrafları ve duyuruları yönetir.
  - Masraf kategorilerini kendi sitesi için özelleştirebilir (ekleyebilir, düzenleyebilir, silebilir).

- **Kat Malikleri (Ev Sahibi) ve Kiracılar:**
  - Kendi dairelerine ait borç, aidat ve ödeme geçmişlerini görüntüler.
  - Sitenin genel gelir ve gider (kasa / masraf) durumunu şeffaf bir şekilde görüntüleyebilir.
  - Sitenin güncel duyurularını görüntüler.

---

#### 2. Giriş ve Kimlik Doğrulama (Auth Modeli)

- **Giriş Yöntemi:** Tüm kullanıcı tipleri için **E-posta + Şifre** kullanılır.
- **Owner & Yönetici:** Kendi e-posta ve şifreleriyle sisteme giriş yapar.
- **Sakinler (Ev Sahibi / Kiracı):** Yönetici sakinleri sisteme eklerken onlar adına şifre belirler ve hesaplarını oluşturur.
- **Şifre Güvenliği:** Tüm şifreler **bcrypt** ile hashlenerek saklanır. Hiçbir şifre düz metin olarak tutulmaz.
- **Token:** JWT tabanlı kimlik doğrulama (Access Token kısa süreli + Refresh Token DB'de saklanır). JWT payload'ında `user_id`, `role` ve `site_id` bilgisi bulunur; bu bilgi site izolasyonu middleware'i tarafından kullanılır.

---

#### 3. Site, Blok ve Daire Yapısı

- Sitelerde çoklu blok desteği bulunur (Örn: A Blok, B Blok veya tek bloklu/müstakil binalar için esnek yapı).
- Daire tanımlamaları **Blok Adı (Opsiyonel)** ve **Kapı Numarası** şeklinde yapılır.
- Her daire için hem **Ev Sahibi** hem de aktif bir **Kiracı** ayrı ayrı ilişkilendirilebilir (aynı anda yalnızca bir aktif kiracı).
- **Daire Silme / Pasife Alma:** Soft delete uygulanır. Daire "pasif" olarak işaretlenir; daireye ait tüm borç, ödeme ve geçmiş veriler korunur, silinmez.

---

#### 4. Borçlandırma ve Aidat Mantığı

- **Sabit Aidat:** Aidat tutarı site bazında sabit tutar olarak uygulanır.
- **Aidat Geçmişi:** Aidat tutarı her değiştirildiğinde `valid_from` tarihiyle birlikte kayıt altına alınır. Geçmiş tahakkuklar geriye dönük değiştirilmez.
- **Aidat Değişikliği Geçerlilik:** Yönetici yeni tutar girerken "bu aydan geçerli" veya "gelecek aydan geçerli" seçeneğini seçer.
- **Otomatik Borç Tahakkuku:** Aidat borçları her ayın 1'inde sistem tarafından otomatik olarak (cron job) dairelere yansıtılır.
- **Borç Muhatabı:**
  - Dairede aktif bir kiracı varsa, aylık rutin aidat borcu doğrudan **Kiracı'ya** tahakkuk ettirilir.
  - Dairede kiracı yoksa (boşsa), rutin aidat borcu **Ev Sahibi'ne** tahakkuk ettirilir.
  - **Demirbaş ve Ekstra Yatırım Giderleri:** Kiracıdan bağımsız olarak her zaman doğrudan **Ev Sahibi'ne** yansıtılır.
- **Kiracı Değişiminde Borç Yönetimi:** Kiracı değişimi sırasında yönetici, eski kiracının ödenmemiş borçları için şu üç seçenekten birini seçer:
  - **Bırak:** Borç eski kiracının hesabında kalmaya devam eder.
  - **Ev Sahibine Devret:** Borç ev sahibine aktarılır.
  - **Sil:** Borç silinir (geri dönülemez).

---

#### 5. Tahsilat, Masraf Takibi ve Şeffaf Kasa

- **Manuel Tahsilat Girişi:** Kredi kartı/sanal POS entegrasyonu olmayacak. Ödemeler nakit/havale kontrolü sonrası yönetici tarafından sisteme manuel girilir.
- **Kısmi Ödeme Desteği:** Kat malikleri veya kiracılar borcun tamamını ödemeyebileceği için parçalı/kısmi ödeme kaydedilebilir. Kalan bakiye (`remaining = toplam_borç - yapılan_ödemeler_toplamı`) otomatik olarak borç hanesinde takip edilir.
- **Kategori Bazlı Masraf Takibi:** Masraflar kategorilere ayrılarak işlenir. Kategoriler site yöneticisi tarafından kendi sitesi için özelleştirilebilir (ekle / düzenle / sil). Varsayılan kategoriler: Elektrik/Su, Temizlik, Asansör Bakımı, Personel/Görevli, Demirbaş/Onarım, Genel Giderler.
- **Şeffaf Kasa:** Siteye ait tüm gelirler ve kategori bazlı giderler sakinlerin erişimine açık bir şekilde özet olarak sunulur (aylık gelir, aylık gider kategori bazlı, net bakiye).

---

#### 6. Fiyatlandırma ve Abonelik (Freemium Modeli)

- **Kapsam & Limit:** Limitlendirme **site bazında** uygulanır.
- **Ücretsiz Katman (Free Tier):** Her site için 10 daireye kadar kullanım tamamen ücretsizdir.
- **Ücretli Katman (Daire Başı Model):** 10 dairenin üzerindeki her ek daire için aylık belirlenecek birim ücret üzerinden tahsilat/faturalandırma yapılır.
- **Limit Aşımında Davranış:** 10 daire sınırına ulaşıldığında sistem yeni daire eklemeyi **tamamen bloke eder.** Yeni daire eklenebilmesi için önce ödeme yapılması (ve limitin Owner tarafından manuel artırılması) gerekir.

---

#### 7. Temel Ekranlar (MVP Kapsamı)

- **Owner Paneli:**
  - Site listesi ve detayları (daire sayısı, freemium/ücretli durum)
  - Yeni site ekleme
  - Site yöneticisi atama (e-posta & şifre belirleme)
  - Herhangi bir sitenin yönetici paneline tam yetkiyle erişim

- **Yönetici Paneli:**
  - Daire ve sakin yönetimi (Blok, Kapı No, Ev Sahibi / Kiracı)
  - Kiracı değişimi (borç devir seçeneği ile)
  - Manuel tahsilat / kısmi ödeme girişi
  - Kategori bazlı masraf girişi + kategori yönetimi
  - Aidat tutarı güncelleme (geçerlilik tarihi seçimi ile)
  - Şeffaf kasa ve gelir-gider özeti
  - Duyuru panosu yönetimi (ekleme / düzenleme / silme)

- **Sakin Paneli:**
  - Güncel borç ve bakiye durumu
  - Geçmiş ödemeler listesi
  - Sitenin şeffaf gelir-gider kasa özeti
  - Duyuru panosu (yalnızca görüntüleme)

---

#### 8. Duyuru Panosu

- **Yetki ve Erişim:**
  - Yalnızca **Site Yöneticisi** duyuru ekleyebilir, güncelleyebilir veya silebilir.
  - Sakinler (Kat Malikleri ve Kiracılar) yalnızca kendi sitelerine ait duyuruları listeleyebilir ve okuyabilir (yorum veya ekleme yetkisi yoktur).
- **Duyuru Alanları:**
  - Başlık
  - İçerik/Metin
  - Önem Derecesi (Normal, Önemli, Acil)
  - Yayın Tarihi / Saati

---

#### 9. Bildirimler

- **MVP kapsamı dışındadır.** Yönetici tüm işlemleri manuel takip eder.
- Mimari bildirim sistemine hazır bırakılır (hook noktaları kodda yorumla belirtilir); ilerleyen versiyonlarda e-posta bildirimleri eklenebilir.

---

#### 10. Raporlama / PDF Ekstre

- **MVP kapsamı dışındadır.**
- Mimari raporlama katmanına hazır bırakılır; ilerleyen versiyonlarda sakin ödemesi veya aylık kasa raporu PDF olarak alınabilir.

