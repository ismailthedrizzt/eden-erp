# Teşkilat/Kadro + Tesisler/Lokasyonlar Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amaç

Teşkilat/Kadro, şirket içi hiyerarşi, organizasyon birimi ve kadro/pozisyon yapısını yönetir. Tesisler/Lokasyonlar ise fiziksel yerleri yönetir. İki modül de Şubelerimiz ile ilişkilendirilebilir, ancak şube değildir.

## Kavram Sınırları

| Kavram | Sorumluluk | Bu modülde davranış |
| --- | --- | --- |
| Şirket | Tüzel kişilik ve resmi lifecycle | Sadece bağlı şirket olarak seçilir. |
| Şube | Bağlı şirket alt resmi/operasyonel birim | Şube Açılışı/Kapanışı operationlarıyla oluşur/kapanır. |
| Organizasyon birimi | Hiyerarşi, kadro ve pozisyon | Teşkilat/Kadro içinde oluşturulur ve yönetilir. |
| Tesis/lokasyon | Fiziksel yer | Tesisler/Lokasyonlar içinde izlenir ve kart seviyesinde yönetilir. |

## Teşkilat/Kadro Kapsamı

- Şirket bazlı organizasyon ağacı.
- Organizasyon birimi create/update.
- Parent/child ilişki yönetimi ve cycle guard.
- Kadro/pozisyon temel create ve summary.
- Şube Açılışı ile oluşan organization unit görünürlüğü.
- Şube Kapanışı sonrası unit action etkilerinin gösterimi.
- Organization scope temsil yetkilerinin read-only gösterimi.

## Tesisler/Lokasyonlar Kapsamı

- Fiziksel lokasyon liste/detail/create/update.
- Şube ile ilişkili lokasyonların görünürlüğü.
- Şube kapanışı sonrası `keep_open`, `deactivate`, `reuse` etkilerinin gösterimi.
- Facility scoped temsil yetkilerinin read-only gösterimi.
- İleride depo, stok, servis, saha operasyonları ve proje lokasyonları için temel veri modeli.

## UX Kuralları

- Kullanıcıya “şube = şirket değildir, facility = şube değildir, organization unit = şube değildir” ayrımı açık gösterilir.
- Teşkilat/Kadro listesi tree/table görünümüyle, şirket/durum/tip/şube bağlantısı filtreleriyle çalışır.
- Tesisler/Lokasyonlar listesi şirket/şube/durum/tür filtreleri ve summary kartlarıyla çalışır.
- Pasife alma veya kapatma etkisi varsa impact panelinde görünür.
- Temsilci yetkisi ilişkileri read-only gösterilir; yönetim Temsilcilerimiz modülünden yapılır.

## API Sözleşmesi

FastAPI canonical endpointleri:

- `GET /api/v1/organization/units`
- `POST /api/v1/organization/units`
- `GET /api/v1/organization/units/{unit_id}`
- `PATCH /api/v1/organization/units/{unit_id}`
- `GET /api/v1/organization/units/{unit_id}/positions`
- `POST /api/v1/organization/units/{unit_id}/positions`
- `GET /api/v1/organization/units/{unit_id}/representative-authorities`
- `GET /api/v1/organization/units/{unit_id}/impact`
- `GET /api/v1/facilities`
- `POST /api/v1/facilities`
- `GET /api/v1/facilities/{facility_id}`
- `PATCH /api/v1/facilities/{facility_id}`
- `GET /api/v1/facilities/{facility_id}/representative-authorities`
- `GET /api/v1/facilities/{facility_id}/impact`

## Kabul Kriterleri

- Teşkilat/Kadro organizasyon birimi ve pozisyon altyapısını ürün seviyesinde gösterir.
- Tesisler/Lokasyonlar gerçek fiziksel lokasyon listesi/detail/create/update deneyimine sahiptir.
- Şube/organization/facility ayrımı UI ve FastAPI sözleşmesinde nettir.
- Organization/facility scoped authority panelleri read-only çalışır.
- Coverage matrix ve E2E checklist günceldir.

## Known Gaps

Known gaps are tracked in [OrganizationFacilityKnownGaps.md](./OrganizationFacilityKnownGaps.md) and summarized in the final release gate risk list.


## Purpose

Purpose: make organization units, positions and facilities usable as first-class operational context for branches, representatives, HR, tasks and after-sales flows without confusing them with legal branch records.
