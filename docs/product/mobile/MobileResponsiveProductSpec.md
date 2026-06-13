# Mobile / Responsive / PWA Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

Eden ERP mobil deneyimi masaustu ekranin kucultulmus hali degildir. Mobil kullanici en sik su isleri hizli yapabilmelidir:

- bekleyen isi gormek
- gorevi veya onayi acmak
- kaydi hizli incelemek
- servis/saha kaydina fotograf veya belge eklemek
- wizard adimlarini tasma olmadan tamamlamak
- zayif ag veya offline durumda ne yapamayacagini anlamak

Native mobil uygulama bu fazin kapsami disindadir. Hedef responsive web + PWA sertlestirmesidir.

## Breakpoint Standardi

- mobile: `< 640px`
- tablet: `640px - 1024px`
- desktop: `> 1024px`

Tailwind `sm`, `md`, `lg` breakpointleri bu standarda uyumlu kullanilir.

## App Shell

Mobilde:

- desktop sidebar yerine drawer kullanilir
- bottom nav ana islere kisayol verir: Ana, Dashboard, Sirket, Gorev, Is Merkezi, Daha Fazla
- Action Center bottom sheet olarak acilir
- Action Guide mobilde sheet icinde arama inputu ile acilir
- header ikonlari 44px touch hedefini korur
- offline banner teknik hata yerine is diliyle bilgi verir

Desktop davranisi korunur.

## Liste ve Tablo Davranisi

SmartDataTable mobilde otomatik kart gorunumune gecer. Kartlar en onemli 4-6 alani gosterir ve Enter/Space ile de acilabilir.

Mobil kart alan onerileri:

- Sirketler: unvan, durum, VKN, sehir, hizli aksiyon
- Ortaklar: ad/unvan, bagli sirket, durum, pay orani, sermaye tutari
- Temsilciler: ad/unvan, yetki durumu, kapsam, limit, baslangic/bitis
- Subeler: sube adi, bagli sirket, durum, il/ilce, facility/unit uyarisi
- Gorevler: baslik, durum, oncelik, atanan, son tarih
- Servis: talep no, musteri, urun, oncelik, durum

Filtre paneli mobilde bottom sheet olarak acilir.

## Form ve Wizard Davranisi

EntityForm mobilde:

- tek sutun layout kullanir
- hero ve tab alanlari 1 kolon baslar, tablet/desktopta genisler
- kaydet/iptal ve operasyon aksiyonlari mobilde sticky bottom action bar olur
- uzun tab listeleri yatay scroll olur
- kilitli alan helperlari tap ile bottom sheet olarak acilir
- validation mesajlari alan altinda kalir

Wizard kurali:

- stepper compact olmali
- geri/ileri butonlari sticky olmali
- eski/yeni deger tablolari mobilde kartlara donusmeli
- blocking reason ekranin ustunde gorunmeli

## PWA

Manifest installable davranisi destekler:

- standalone display
- app id/start_url/scope
- 192/512 ve maskable iconlar
- dashboard, is merkezi ve gorev kisayollari

Offline mutation bu fazda yoktur. Offline durumda uygulama shell/offline bilgi sayfasi acilabilir, veri degistiren islemler baglanti ister.

## Kabul Kriterleri

- Mobil dashboard acilir ve bottom nav gorunur.
- Action Center mobilde full-width sheet olarak acilir.
- Action Guide mobilde arama inputu olan sheet olarak acilir.
- SmartDataTable mobilde kart gorunumune gecer.
- EntityForm mobilde tek kolon ve sticky aksiyon bar kullanir.
- Belge/fotograf yukleme inputlari mobil kamera secimini destekler.
- PWA manifest ve service worker build kirmaz.
- API/auth/session/mutation cevaplari service worker cache'ine alinmaz.

## Known Gaps

Known gaps are tracked in [MobileKnownGaps.md](./MobileKnownGaps.md) and summarized in the final release gate risk list.


## API Endpoints

Mobile/responsive hardening does not introduce a separate mobile API. Mobile views consume the same Next BFF/FastAPI endpoints, permissions and scope checks as desktop.
