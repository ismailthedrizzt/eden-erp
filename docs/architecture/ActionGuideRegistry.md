# Action Guide Registry

AI Islem Rehberi, kullanicinin dogal dilde yazdigi isi Eden ERP icindeki tanimli action sozlesmelerine esler. MVP deterministik calisir; yeni islem uydurmaz ve veri degistirmez.

## Ilkeler

- Rehber sadece sayfa acma, kayit odaklama veya wizard baslatma onerisi verir.
- Veri degistiren tum islemler ilgili wizard icinde kullanici onayi gerektirir.
- Action sadece `ActionGuideRegistry` ve `Module Registry` icinde tanimliysa onerilir.
- Modul kapaliysa action baslatilabilir gibi gosterilmez.
- Yetki yoksa buton disabled olur ve sebep kullanici diliyle gosterilir.
- Kayit durumu uygun degilse neden ve varsa alternatif islem gosterilir.

## Dosyalar

- `lib/action-guide/actionGuide.types.ts`: Action, request, response ve context tipleri.
- `lib/action-guide/actionRegistry.ts`: Sirket, ortak, temsilci, sube, organizasyon ve tesis action tanimlari.
- `lib/action-guide/intentMatcher.ts`: Deterministik intent matcher.
- `lib/action-guide/actionGuideResolver.ts`: Match + eligibility + response uretimi.
- `lib/action-guide/actionGuideContext.ts`: Tenant, permission, module runtime ve secili kayit context'i.
- `lib/action-guide/actionGuideEligibility.ts`: Modul, yetki, kayit durumu ve policy uyumlulugu.
- `components/ai/*`: Global "Ne yapmak istiyorsunuz?" arayuzu.

## Matching

MVP matcher su sinyalleri kullanir:

- Turkce normalize edilmis keyword eslesmesi
- intent example eslesmesi
- sayfa/modul baglami
- secili kayit tipi ve status bilgisi
- field lock ifadeleri

Ornekler:

- "sube acmak istiyorum" -> `branch_opening`
- "sermaye artirimi yapacagim" -> `capital_increase`
- "adres degistirecegim" -> `address_change`
- "temsilciye banka yetkisi ver" -> `representative_start`
- "sermaye alani kapali" -> `capital_increase`

## Eligibility

Eligibility su kontrolleri yapar:

- required module aktif mi?
- optional module eksikse uyari verilmeli mi?
- required/fallback permission var mi?
- secili kayit tipi dogru mu?
- kayit statusu uygun mu?
- Policy Engine action'i engelliyor mu?

Sermaye Artirimi gibi bagimli islemler icin Ortaklarimiz modulu ve guncel ortaklik dagilimi gerekliligi kullaniciya aciklanir. Sube Acilisi icin organization/facilities modulleri opsiyonel uyari olarak doner.

## API

`POST /api/ai/action-guide`

Bos query sik kullanilan actionlari dondurur. Dolu query en iyi intent'i, alternatif eslesmeleri, adimlari, engel sebeplerini, uyarilari ve komut butonlarini dondurur.

Rehber endpoint'i veri degistirmez. `POST /api/ai/action-guide/actions` da sadece yonlendirme komutunun guvenli oldugunu bildirir; mutation yapmaz.

## FastAPI Eligibility

Action Guide intent matching TS tarafinda migration bridge olarak kalabilir; ancak
canonical action eligibility Python tarafinda `backend/app/policies/action_eligibility.py`
ve `/api/v1/policy/action-eligibility` endpointiyle uretilebilir hale geldi.
Tam resolver migration sonraki fazda tamamlanacaktir.
