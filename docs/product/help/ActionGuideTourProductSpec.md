# Action Guide + Guided Tour Product Spec

## Amac

Bu calisma Action Guide, Guided Tour, Page Tour, Operation Hint ve Locked Field Helper altyapilarini kullanicinin isi dogru sayfa, kayit veya sihirbaza cevirebildigi urun deneyimine tasir. Kullaniciya mimari anlatilmaz; yapmak istedigi is, tanimli action registry ve backend eligibility kararlari icinde yonlendirilir.

## Kapsam

- Action Guide dogal dil sorgusunu registry action intentlerine esler.
- Mevcut sayfa, secili kayit, kayit durumu, sirket/sube baglami, modul readiness, feature flag ve yetki bilgisi dikkate alinir.
- Rehber veri degistirmez; mutation yalnizca ilgili wizard veya operation endpointinde kullanici onayiyla olur.
- Registry disinda action uretilemez.
- Dusuk confidence durumunda tek karar vermek yerine alternatifler gosterilir.
- Field helper, operation button ve Action Guide ayni module/status/permission/readiness reason dilini kullanir.

## Kullanici Rolleri

- Gunluk kullanici: dogru islem yolunu bulur, neden bir alani degistiremedigini gorur.
- Yetkili operasyon kullanicisi: wizard baslatabilir, engel varsa hangi kayit/modul hazirliginin eksik oldugunu gorur.
- Admin: modul/lisans/kurulum eksiklerini Kurulum Merkezi veya Modul Ayarlari uzerinden tamamlar.
- Denetim yetkilisi: kayit gecmisi ve audit timeline yonlendirmelerini kullanir.

## Action Guide Davranisi

- Global placeholder: "Ne yapmak istiyorsunuz?"
- Donen ornekler: sube acma, sermaye artirimi, temsilci banka yetkisi, yeni ortak, adres degisikligi, bekleyen isler.
- Debounce ve Enter ile arama desteklenir.
- Son aramalar cihaz cache'inde gorunur; backend user state rehber/tour tercihleri icin esastir.
- Loading, empty, low-confidence ve hata state'leri vardir.
- Sonuc karti baslik, aciklama, adimlar, baslatilabilirlik, blocking reasons, warnings, onerilen aksiyonlar ve alternatifleri gosterir.

## Intent Coverage

Sirket:

- sirket ekle, sirket acilisi, unvan/adres/kamu/NACE/faaliyet konusu degisikligi
- sermaye artirimi, sermaye azaltimi, tasfiye, terkin

Ortak:

- yeni ortak, ilk ortaklik girisi, pay devri, ortakliktan cikis
- pay/oy/kar payi degisikligi, duzeltme ve ters kayit sorgulari

Temsilci:

- yeni temsilci, temsilcilik baslatma, imza/banka/GIB/SGK yetkisi
- sube/organizasyon/tesis kapsamli yetki, limit degisikligi, askiya alma ve sonlandirma

Sube:

- sube acma, kapatma, belge guncelleme, detay, yetkili/kadro/lokasyon sorgulari

Teskilat/Kadro ve Tesis/Lokasyon:

- organizasyon birimi/departman/kadro/pozisyon, organizasyon agaci
- tesis/lokasyon ekleme, kapatma, reusable kullanilabilirlik ve yetkili sorgulari

Surec/Audit/Setup:

- bekleyen isler, gorevlerim, onay bekleyenler, surec durumu
- bu kaydi kim degistirdi, islem gecmisi, yetki/ortaklik degisikligi
- modul neden kapali, kurulum eksikleri, lisans ve feature flag durumlari

## Context Usage

- Sirket detayinda "sube ac" aktif sirket icin `branch_opening`, taslak sirket icin once `company_opening` onerir.
- Ortak detayinda "pay orani degismiyor" kart editini degil `share_transfer` veya ownership islemlerini onerir.
- Temsilci detayinda aktif yetki varsa "banka yetkisi" `representative_authority_scope_change` veya limit degisikligine agirlik verir; aktif yetki yoksa `representative_start` onerilir.
- Sube detayinda "yetkilileri kim" sube detay/temsilci filtreli gorunume yonlendirir.
- Kurulum sayfasinda "sermaye artirimi neden kapali" Ortaklarimiz/readiness gerekcesini ve Kurulum Merkezi aksiyonunu gosterir.

## Blocking Reason Standardi

Kullaniciya teknik hata gosterilmez. Standart reason ornekleri:

- "Bu islem yalnizca aktif kayitlarda yapilabilir."
- "Bu islem yalnizca taslak kayitlarda yapilabilir."
- "Bu islem icin Ortaklarimiz modulu aktif olmalidir."
- "Sube bazli yetki icin Subelerimiz modulu aktif olmalidir."
- "Bu modulun kurulumu tamamlanmamis."
- "Guncel ortaklik dagilimi hazir olmadigi icin islem baslatilamaz."
- "Bu islem icin yetkiniz bulunmuyor."
- "Mevcut ortaklik dagilimi %100 olmadigi icin islem baslatilamaz."

## Guided Tour

Genel tur adimlari: hos geldiniz, sol menu, liste sayfalari, + Ekle taslak, form detay, islem sihirbazlari, kilitli alanlar, Action Guide, Action Center, Kurulum Merkezi.

Davranis:

- spotlight/popover, ileri/geri/atla/tekrar gosterme
- backend user preferences ile kalicilik
- mobile bottom sheet, keyboard ESC close, reduced motion
- hedef yoksa fallback target veya sonraki adim

## Page Tours

Sayfa turlari Sirketlerimiz, Ortaklarimiz, Temsilcilerimiz, Subelerimiz, Teskilat/Kadro, Tesisler/Lokasyonlar, Action Center, Audit ve Kurulum icin kisa urun aciklamalari sunar.

## Operation Hints

Operation hints form/sayfa icinde kisa is diliyle kritik ayrimi anlatir: kart taslagi ile resmi operation arasindaki fark, modul hazirlik eksigi veya field helper'a giden dogru aksiyon.

## Field Helpers

Locked field helper popover su bilgileri gosterir:

- alanin neden kilitli oldugu
- ilgili islem veya wizard
- baslatilabilirlik durumu
- disabled reason ve warnings
- action button
- "Bu islem hakkinda bilgi al" rehber linki

Kapsam: Company trade_name/address/capital/NACE/activity; Partner share/vote/profit/capital; Representative authority/scope/limit/status; Branch name/address/opening/closing/document fields.

## Preferences

Backend user preferences icinde su alanlar tutulur:

- hasSeenGlobalTour
- completedTourSteps
- dismissedPageTours
- dismissedOperationHints
- dismissedFieldHelpers
- lockedFieldHintsDismissed
- preferredHelpMode
- lastTourVersion
- actionGuideDismissed
- showAdvancedHelp ve showTechnicalDetails daha sonraki admin-only gap'tir.

## API Endpoints

- `POST /api/ai/action-guide`: Next UI adapter, registry-constrained resolver.
- `POST /api/ai/action-guide/actions`: mutation yapmayan yonlendirme komutu adapter'i.
- `GET/PATCH /api/user/preferences`: backend user state kaydi.
- `POST /api/onboarding/system-tour/start|step|complete|skip|postpone`: global tour state.
- `POST /api/policy/action-eligibility`, `POST /api/action-eligibility/evaluate`: canonical FastAPI policy/readiness/integrity eligibility.
- `GET /api/setup/readiness`, `GET /api/modules`, `GET /api/features`: kurulum, modul ve feature flag gorunurlugu.

## Acceptance Criteria

1. Action Guide dogru action'a baglar ve registry disi action uretmez.
2. Context-aware oneriler aktif sirket/taslak sirket/temsilci yetki/ortak pay senaryolarinda calisir.
3. Blocking reason'lar Action Guide, field helper ve operation visibility ile ayni dildir.
4. Genel tur ve page tour state'i backend preference ile saklanir.
5. Operation hints ve field helpers kullaniciyi dogru wizard veya setup yoluna yonlendirir.
6. Product docs, real data scenarios, E2E checklist ve known gaps vardir.
7. Typecheck/build/backend testleri bozulmaz.
