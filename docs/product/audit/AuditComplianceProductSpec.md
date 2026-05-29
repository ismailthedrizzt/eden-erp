# Audit Compliance Product Spec

## Purpose

Denetim Izi ekrani teknik log okuyucusu degildir. Yetkili kullanicinin "kim, ne zaman, hangi kayit uzerinde, hangi islem kapsaminda ne yapti?" sorusunu is diliyle cevaplar.

## Scope

- Audit log listeleme ve filtreleme.
- Audit detay cekmecesinde masked old/new degerleri gosterme.
- Kayit bazli reusable audit timeline.
- Operation/process/task/approval/request baglantilarini gosterme.
- Compliance rapor gorunumleri icin filtre presetleri.
- Sensitive value masking ve admin-only teknik detay ayrimi.

## Concept Boundaries

- History: kullaniciya donuk is gecmisi.
- Transaction: resmi/operasyonel islem kaydi.
- Process Event: surec adimi, gorev ve onay gecmisi.
- Outbox Event: sistem ici olay kuyrugu; normal kullaniciya teknik detay olarak gosterilmez.
- Audit Log: denetim, guvenlik ve compliance izi.

## Roles

- Audit viewer: liste, filtre, detay ve kayit timeline gorur.
- Admin/system: teknik JSON, request/correlation, outbox/security sinyallerini gorebilir.
- Normal user: is gecmisi panellerini gorebilir; audit admin ekranina erisemez.

## UI Structure

- Header: Denetim Izi tanimi, masking uyarisi, export hazirligi.
- Summary: toplam, engellenen, basarisiz, uyari/kritik ve varsayilan tarih araligi.
- Reports: kullanici islemleri, resmi islemler, yetki, ortaklik, engellenen islemler, sistem uyarilari.
- Filters: tarih, kullanici, modul, action, sonuc, severity, company, branch, entity, operation, process, search.
- List: tarih, kullanici, modul, islem, kayit, sonuc, onem, aciklama, request id.
- Detail drawer: old/new masked values, operation/process/task/approval/request links, admin debug.

## API Endpoints

- `GET /api/v1/audit`
- `GET /api/v1/audit/{audit_id}`
- `GET /api/v1/audit/by-record`
- `GET /api/v1/audit/by-operation`
- `GET /api/v1/audit/by-process`

## Security

- FastAPI audit endpoints require `audit.view`.
- Page size is capped at 100.
- Default list scope is the last 7 days.
- Token/password/secret/signed URL values are masked.
- Export is prepared but disabled until `audit.export` permission and export audit event are implemented.

## Acceptance Criteria

- Audit admin UI opens as a product screen.
- Detail drawer shows old/new masked values.
- Record timeline component can fetch by `entity_type` and `entity_id`.
- Permission/policy/scope denied audit entries are visible when written by real API attempts.
- Operation/process relationships are visible from audit detail.
- FastAPI and Next proxy coverage docs are up to date.

## Known Gaps

Known gaps are tracked in [AuditKnownGaps.md](./AuditKnownGaps.md) and summarized in the final release gate risk list.
