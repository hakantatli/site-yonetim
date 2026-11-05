# ADR 0002: Sayaç Tüketim Dağıtımında Tam Sayı Yuvarlama ve Ortak Alan Denkliği

- **Tarih:** 2026-09-14
- **Durum:** Kabul Edildi (Accepted)

---

## 1. Bağlam (Context)

Merkezi tüketilen kaynaklarda (su, elektrik, doğal gaz), fatura tutarı toplam tüketime bölündüğünde genellikle virgülden sonra çok basamaklı bir birim fiyat ortaya çıkar (Örn: 9.000 TL / 3.000 m³ = 3.0000 TL veya küsuratlı birim fiyatlar).

Dairelerin süzme sayaç tüketimleri bu birim fiyatla çarpıldığında ortaya 147.38 TL gibi kuruşlu borçlar çıkmaktadır. Apartman sakinleri aidat veya fatura öderken kuruşlu tutarları ödemekte zorlanmakta, havale yuvarlamaları nedeniyle veritabanında 0.38 TL gibi kapanmayan küçük borç kırıntıları birikmektedir.

---

## 2. Karar (Decision)

1. Dairelerin bireysel tüketim payları en yakın tam sayıya yuvarlanır:
   $$\text{Daire Ücreti} = \text{round}(\text{Daire Tüketimi} \times \text{Birim Fiyat})$$
2. Bina ana fatura tutarı ile dairelere dağıtılan tutarların toplamı kuruşu kuruşuna denk olmak zorundadır. Bu nedenle yuvarlamadan kaynaklanan tüm artı veya eksi farklar, bina yönetiminin kendi karşıladığı **Ortak Alan Payına** yansıtılır:
   $$\text{Ortak Alan Tutarı} = \text{Fatura Tutarı} - \sum \text{Daire Ücretleri}$$

---

## 3. Sonuçlar (Consequences)

### Avantajlar:
- Sakinlere her zaman kuruşsuz net tam TL borç tahakkuk eder (Örn: 147 TL).
- Sakinlerin banka transferlerinde yuvarlama yapmasından doğan "kısmi ödeme / açık borç" kalıntıları engellenir.
- Bina ana faturası ile sistemdeki toplam borçlandırma arasındaki kuruş dengesi sıfır sapma ile (%100) korunur.

### Göze Alınan Kısıtlar:
- Yuvarlama farkı (genellikle birkaç TL'lik marj) ortak alan faturasına kaydırılır; ortak alan bina yönetimi bütçesinden karşılandığı için sakinler açısından adaletsizlik yaratmaz.
