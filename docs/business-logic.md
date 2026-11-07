# İş Kuralları ve Finansal Mantık (Business Logic)

Bu belge, Site Yönetim Uygulamasının tüm çekirdek iş mantığını, borçlandırma mekanizmalarını, sayaç tüketim dağıtım formüllerini ve finansal kurallarını detaylandırır.

---

## 1. Daire ve Sakin Yönetimi

### Blok ve Daire Tanımları
- Sitelerde çoklu blok yapısı esnek olarak desteklenir (Örn: "A Blok", "B Blok" veya müstakil binalar için boş/tek blok).
- Daireler `Blok Adı (Opsiyonel)` ve `Kapı Numarası` ile tanımlanır.
- Her daire için bağımsız olarak bir **Ev Sahibi (Kat Maliki)** ve isteğe bağlı aktif bir **Kiracı** tanımlanabilir. Bir dairede aynı anda en fazla bir aktif kiracı bulunabilir.

### Daire Silme ve Veri Korunması (Soft Delete)
- Daireler fiziksel olarak veritabanından silinmez (`is_active = false` bayrağı ile pasife alınır).
- Amaç: Daireye ait geçmiş aidat tahakkukları, sayaç kayıtları, ödeme makbuzları ve finansal denetim izlerinin asla kaybolmamasını sağlamaktır.

### Kiracı Değişimi ve Borç Yönetimi
Bir daireden kiracı tahliye edildiğinde veya yeni bir kiracı atandığında, eski kiracının ödenmemiş borçları için yöneticiye üç seçenek sunulur:
1. **Bırak:** Borç eski kiracının üzerinde kalmaya devam eder (yasal takip veya sonradan tahsilat için).
2. **Ev Sahibine Devret:** Eski kiracının ödenmemiş tüm borç bakiyesi doğrudan kat malikine (ev sahibine) devredilir (`debts.debtor_user_id` güncellenir ve denetim geçmişine not düşülür).
3. **Sil:** Ödenmemiş borçlar sistemden kalıcı olarak silinir.

---

## 2. Aidat ve Borçlandırma Mantığı

### Sabit Aidat ve Geçmiş Tutar Koruması
- Aidat tutarı site bazında sabit tutar olarak belirlenir.
- Aidat tutarı her güncellendiğinde `due_rates` tablosuna `valid_from` geçerlilik tarihi ile yeni bir satır olarak kaydedilir.
- Geçmiş dönemlerin aidat tahakkukları asla geriye dönük etkilenmez; her dönemin borcu o dönemde geçerli olan tutar üzerinden korunur.
- Yönetici yeni aidat tutarını belirlerken geçerlilik için iki seçenekten birini seçer:
  - *Bu Aydan Geçerli:* İçinde bulunulan ayın başlangıcından itibaren uygulanır.
  - *Gelecek Aydan Geçerli:* Bir sonraki ayın 1'inden itibaren yürürlüğe girer.

### Otomatik Aylık Borç Tahakkuku (Cron Scheduler)
- Her ayın 1'inde gece yarısı sistem cron görevi (`robfig/cron`) otomatik olarak tetiklenir.
- Sitedeki tüm aktif daireler için ilgili ayın aidat borcu (`type = 'due'`) tahakkuk ettirilir.

### Yönetici Dairesi Aidat Muafiyeti (`is_due_exempt`)
- Yönetici olan kat maliklerinin veya kapıcı/görevli dairelerinin aylık aidattan muaf tutulması senaryosunu destekler.
- Daire veya Aidat ekranından "Aidattan Muaf" (`is_due_exempt = true`) olarak işaretlenen dairelere, otomatik aylık cron veya manuel toplu tahakkuk çalıştığında aidat borcu yansıtılmaz.

### Borç Muhatabı Kuralı
1. **Rutin Aylık Aidat Borçları:**
   - Dairede aktif bir kiracı varsa: Borç doğrudan **Kiracı'ya** tahakkuk ettirilir.
   - Daire boşsa (kiracı yoksa): Borç doğrudan **Ev Sahibi'ne** tahakkuk ettirilir.
2. **Demirbaş ve Yatırım Giderleri (`type = 'fixture'`):**
   - Dairede kiracı olup olmamasından bağımsız olarak, bina demirbaş harcamaları, asansör yenileme, dış cephe mantolama gibi mülk yatırımları her zaman doğrudan **Ev Sahibi'ne** tahakkuk ettirilir.

---

## 3. Tahsilat, Kısmi ve Fazla Ödeme Kuralları

- **Manuel Tahsilat:** Kredi kartı/sanal POS entegrasyonu yoktur. Ödemeler banka dekontu veya nakit kontrolü sonrası yönetici tarafından sisteme manuel girilir.
- **Kısmi Ödeme (Eksik Ödeme):**
  - Kat maliki veya kiracı borcun bir kısmını ödediğinde, kalan bakiye `debt_summary` view'ı üzerinden dinamik olarak hesaplanır (`remaining = total_amount - paid_amount`).
  - Borcun durumu `partial` (kısmi ödendi) yapılır.
  - Ödeme notuna otomatik olarak `[Eksik Ödeme: ₺X.XX]` etiketi eklenir.
- **Fazla Ödeme:**
  - Sakin yuvarlayarak veya sehven borç tutarının üzerinde bir ödeme gönderdiğinde, borcun kalan bakiyesi sıfırlanır ve durumu `paid` (tam ödendi) yapılır.
  - Aradaki fazla ödenen fark otomatik olarak ödeme makbuzu notuna `[Fazla Ödeme: ₺X.XX]` şeklinde kaydedilir.

---

## 4. Sayaç Okuma ve Tüketime Dayalı Fatura Dağıtımı

Sitede merkezi tüketilip süzme sayaçlarla paylaştırılan kaynaklar (Su, Elektrik, Doğal Gaz vb.) için tüketim dağıtım algoritması şu şekilde çalışır:

### 1. Fatura ve Ana Sayaç Girişi
- Yönetici ilgili döneme ait (YYYY-MM) faturanın toplam tutarını, ana sayacın ilk ve son endeksini sisteme girer.
- `Fatura Toplam Tüketimi = Ana Sayaç Son Endeks - Ana Sayaç İlk Endeks`
- `Birim Fiyat = Fatura Tutarı / Fatura Toplam Tüketimi`

### 2. Daire Süzme Sayaçları
- Her daire için ilk ve son endeks kaydedilir (önceki dönemin son endeksi sistem tarafından otomatik ilk endeks olarak getirilir).
- `Daire Tüketimi = Daire Son Endeks - Daire İlk Endeks`
- `Daire Ham Tüketim Bedeli = Daire Tüketimi * Birim Fiyat`

### 3. Ortak Alan Tüketimi (Site Yönetimi Borcu)
- `Ortak Alan Tüketimi = Fatura Toplam Tüketimi - Tüm Dairelerin Tüketimleri Toplamı`
- Ortak alan bedeli bina/site yönetiminin kendi genel gideridir; kesinlikle dairelere paylaştırılmaz ve dairelerin su/elektrik borcuna eklenmez.

### 4. Borç Yuvarlama ve Kuruş Denkliği
- Sakinlere küsuratlı kuruş borç çıkarmamak adına, dairelerin bireysel payları en yakın tam sayıya yuvarlanır:
  $$\text{Daire Ücreti} = \text{round}(\text{Daire Tüketimi} \times \text{Birim Fiyat})$$
- Dairelerin yuvarlanmış toplam tutarı ile ortak alan bedelinin toplamı ana faturaya kuruşu kuruşuna eşit olmak zorundadır. Yuvarlama farkı doğrudan site yönetiminin karşıladığı ortak alan bedeline yansıtılır:
  $$\text{Ortak Alan Tutarı} = \text{Fatura Tutarı} - \sum \text{Daire Ücretleri}$$

### 5. Dağıtım Tablosundaki Toplam Borç
Sayaç dağıtım detay tablosunda daire için gösterilen **Toplam Borç**:
$$\text{Toplam Borç} = \text{Bu Ayın Bireysel Ücreti} + \text{Varsa Önceki Dönemlerden Kalan Ödenmemiş Aynı Sayaç Borcu}$$
Bu sayede yönetici dairenin hem bu ayki tüketim ücretini hem de geçmişten devreden ödenmemiş fatura borcunu aynı tabloda tek bakışta görür.

---

## 5. Masraf Takibi ve Fatura Belgeleri

- **Kategoriler:** Masraflar kategori bazlı işlenir (Elektrik/Su, Temizlik, Asansör Bakımı, Personel/Görevli, Demirbaş/Onarım, Genel Giderler). Site yöneticisi kategorileri kendi sitesi için ekleyebilir, güncelleyebilir veya silebilir.
- **Fatura / Fiş Belgesi Yükleme:**
  - Yeni masraf eklenirken opsiyonel olarak fatura belgesi yüklenebilir.
  - Maksimum dosya boyutu **2 MB**'dır.
  - İzin verilen formatlar: **PDF** (`application/pdf`) ve **JPEG** (`image/jpeg`).
  - Güvenlik: Yalnızca dosya uzantısı değil, dosyanın ilk byte'ları (magic bytes) doğrulanır.
  - Saklama: Dosya ikili verisi (binary) atomik olarak veritabanında `expense_invoices` tablosunda saklanır. Liste sorgularında bu binary alan çekilmez; sadece önizleme tıklandığında stream edilir.

---

## 6. Şeffaf Kasa ve Devir Bakiyesi

- Sitenin tüm gelirleri (tahsilatlar) ve masrafları sakinlerin ve yöneticinin erişimine açık şeffaf bir özet olarak sunulur.
- **Açılış / Devir Bakiyesi (`initial_balance`):** Site yöneticisi, siteyi sisteme taşırken mevcut kasa/banka birikimini açılış bakiyesi olarak sisteme işleyebilir.
- **Net Kasa Bakiyesi:**
  $$\text{Net Kasa Bakiyesi} = \text{Açılış/Devir Bakiyesi} + \text{Toplam Yapılan Tahsilatlar} - \text{Toplam Masraflar}$$

---

## 7. Fiyatlandırma, Self-Service Kayıt & Freemium Modeli

- **Self-Service Yönetici Kaydı ve Çoklu Site:** Dışarıdan site/apartman yöneticileri `/register` üzerinden kendi hesaplarını ve ilk sitelerini oluşturabilir, sonrasında `/admin` panelinden istedikleri kadar yeni site ekleyebilirler.
- Model site bazlıdır:
  - **Ücretsiz Katman (Free Tier):** Yöneticinin eklediği her bir sitede **10 daireye kadar** kullanım tamamen ücretsizdir (`apartment_limit = 10`).
  - **Ücretli Katman:** 10 dairenin üzerindeki siteler için ek daire başına ücretlendirme uygulanır.
- **Limit Aşımı Davranışı:** 10 daire sınırına ulaşıldığında sistem yeni daire ekleme butonunu ve API isteğini **tamamen bloke eder**. Daire eklenebilmesi için limitin Owner tarafından yükseltilmesi gerekir.
