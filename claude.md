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

- **Giriş Yöntemi:** Tüm kullanıcı tipleri için **Telefon Numarası + Şifre** kullanılır (Telefon numarası zorunlu tekil alan, e-posta opsiyoneldir; sistem telefon veya e-posta ile girişi destekler).
- **Owner & Yönetici:** Kendi telefon numarası ve şifreleriyle sisteme giriş yapar.
- **Sakinler (Ev Sahibi / Kiracı):** Yönetici sakinleri sisteme eklerken telefon numaralarını zorunlu girer, onlar adına şifre belirler ve hesaplarını oluşturur.
- **Şifre Güvenliği:** Tüm şifreler **bcrypt** ile hashlenerek saklanır. Hiçbir şifre düz metin olarak tutulmaz.
- **Token:** JWT tabanlı kimlik doğrulama (Access Token kısa süreli + Refresh Token DB'de saklanır). JWT payload'ında `user_id`, `phone`, `role` ve `site_id` bilgisi bulunur; bu bilgi site izolasyonu middleware'i tarafından kullanılır.

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
- **Toplu Borçlandırma:** Ortak tadilat, bakım/onarım veya demirbaş gibi sitenin tamamını ilgilendiren harcamalarda yöneticiler sitedeki tüm aktif dairelere tek seferde toplu borç tahakkuk ettirebilir. Demirbaş ve yatırım giderleri kural gereği doğrudan kat maliklerine (ev sahiplerine) yansıtılır; diğer harcamalarda muhatap seçimi (ev sahipleri veya kiracı-öncelikli) yapılabilir.

---

#### 5. Tahsilat, Masraf Takibi ve Şeffaf Kasa

- **Manuel Tahsilat Girişi:** Kredi kartı/sanal POS entegrasyonu olmayacak. Ödemeler nakit/havale kontrolü sonrası yönetici tarafından sisteme manuel girilir.
- **Kısmi ve Fazla Ödeme Desteği:** Kat malikleri veya kiracılar borcun tamamını ödemeyebileceği gibi (parçalı/kısmi ödeme), sehven veya yuvarlayarak borç tutarının üzerinde de (fazla ödeme) ödeme gönderebilirler. Kısmi ödemede kalan bakiye (`remaining = toplam_borç - yapılan_ödemeler_toplamı`) takip edilir; borç tutarını aşan fazla ödemelerde ise borç tamamen ödendi (`paid`) olarak işaretlenir, aradaki fazla fark otomatik olarak ödeme notuna (`[Fazla Ödeme: ₺X.XX]`) eklenir ve kalan borç bakiyesi 0 olarak kabul edilir.
- **Kategori Bazlı Masraf Takibi:** Masraflar kategorilere ayrılarak işlenir. Kategoriler site yöneticisi tarafından kendi sitesi için özelleştirilebilir (ekle / düzenle / sil). Varsayılan kategoriler: Elektrik/Su, Temizlik, Asansör Bakımı, Personel/Görevli, Demirbaş/Onarım, Genel Giderler.

- **Şeffaf Kasa & Devir Bakiyesi:** Siteye ait tüm gelirler ve kategori bazlı giderler sakinlerin erişimine açık bir şekilde özet olarak sunulur (aylık gelir, aylık gider kategori bazlı, net bakiye). Yönetici, siteyi sisteme taşırken mevcut kasa/banka birikimini **Açılış / Devir Bakiyesi** (`initial_balance`) olarak sisteme girebilir ve güncelleyebilir; net kasa bakiyesi `Net Bakiye = Devir Bakiyesi + Toplam Tahsilat - Toplam Masraf` şeklinde hesaplanır. Hem yönetici hem de sakin ekranlarında bu başlangıç bakiyesi şeffafça dökümlenir.

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

- **Aylık Gelir ve Gider Raporları:** Yönetici ve Owner, seçilen aya ait gelirleri (tahsilatlar) veya giderleri (masraflar) ayrı raporlar halinde listeleyip doğrudan tarayıcı üzerinden yazdırabilir veya PDF olarak kaydedebilir (`window.print()`).
- **Format:** Numaralı liste (`No`), her bir işlem tek satır olacak şekilde: `No` -> `Tarih` -> `İşlem Detayı` (Daire/Sakin/Borç Türü/Ödeme Yöntemi veya Kategori/Açıklama/Fiş No) -> `Meblağ` (en sağda ₺ formatında).
- **Özet:** Raporun alt kısmında dönem toplam işlem sayısı ve genel toplam tutarı yer alır (imza alanı gerekmez).

---

#### 11. Sayaç Okuma ve Tüketime Dayalı Borçlandırma (Su, Doğal Gaz vb.)

- **Sayaç Türleri:** Sitede tüketilen kaynaklar (Su, Doğal Gaz, Isı Pay Ölçer, Elektrik vb.) birimleriyle (`m³`, `kWh` vb.) site bazında yönetici tarafından tanımlanabilir ve özelleştirilebilir. Varsayılan olarak her site için "Su (m³)" ve "Doğal Gaz (m³)" tanımlıdır.
- **Fatura ve Ana Sayaç Girişi:**
  - Yönetici, ilgili dönemin (YYYY-MM) faturasını işlerken fatura tutarını, ana sayacın ilk ve son endeksini girer.
  - `Fatura Toplam Tüketimi = Ana Sayaç Son Endeks - Ana Sayaç İlk Endeks`.
  - `Birim Fiyat = Fatura Tutarı / Fatura Toplam Tüketimi`.
- **Daire Süzme Sayaçları:**
  - Her daire için ilk ve son endeks girilir (bir önceki dönemin son endeksi sistem tarafından otomatik ilk endeks olarak getirilir).
  - `Daire Tüketimi = Son Endeks - İlk Endeks`.
  - `Daire Bireysel Tüketim Bedeli = Daire Tüketimi * Birim Fiyat`.
- **Ortak Alan Tüketimi (Site Yönetimi Borcu):**
  - `Ortak Alan Tüketimi = Fatura Toplam Tüketimi - Tüm Dairelerin Toplam Tüketimi`.
  - `Ortak Alan Bedeli = Ortak Alan Tüketimi * Birim Fiyat`.
  - Ortak alan bedeli bina / site yönetiminin kendi gideridir; dairelere paylaştırılıp dairelerin borcuna eklenmez.
- **Daire Borç Tahakkuku ve Toplam Borç Mantığı:**
  - Daireye bu dönem için tahakkuk eden yeni borç tutarı doğrudan `Daire Bireysel Tüketim Bedeli`dir (`Daire Tüketimi * Birim Fiyat`).
  - Sayaç okuma dağıtım tablosundaki `Toplam Borç`: Dairenin varsa daha önceki aylardan kalan ödenmemiş su/sayaç borcu ile bu dönem yeni dağıtılan bireysel tüketim borcunun toplamıdır (`Toplam Borç = Varsa Önceki Su Borcu + Yeni Bireysel Dağıtım Borcu`).
  - Borç kaydı `utility` türünde açılır ve muhatabı kiracı varsa kiracıya, daire boşsa ev sahibine tahakkuk eder.
- **Şeffaf Görüntüleme:**
  - **Yönetici Paneli:** Tüm geçmiş dönemlerin ana sayaç, daire sayaçları, birim maliyet ve ortak alan dökümleri listelenir ve detay modalı ile görüntülenebilir.
  - **Sakin Paneli:** Sakinler kendi dairelerinin ilk/son endeksini, tüketimini, birim fiyatını, bina ana fatura tutarını ve bina ortak alan tüketimini şeffafça inceler.


