# Tenant / Calisma Alani Foundation

Eden ERP'de her musteri veya bagimsiz sirket grubu bir tenant / calisma alani olarak ele alinacak. Bu foundation katmani bugun icin pasiftir; mevcut ekranlar ayni `public` schema uzerinde calismaya devam eder.

## Hedef Model

Tenant iki seviyede temsil edilir:

- `public.erp_instances`: Tenant / workspace ana kaydi. Eski `instance` kavrami geriye uyum icin korunur.
- `public.tenant_database_bindings`: Tenant'in veri izolasyon stratejisi. Desteklenen modlar `shared_schema`, `dedicated_schema`, `dedicated_database`.

Provisioning veya yonetim ekranlari ayrica `tenant_workspaces` benzeri bir planlama tablosu kullanabilir. Runtime kontrati yine `erp_instances.id` uzerinden ilerlemelidir; varsa planlama kaydi `erp_instance_id` ile bu kayda baglanir.

Sirket gruplari tenant'a su tabloyla baglanir:

- `public.tenant_company_scopes`: Bir tenant'in hangi sirketleri sahiplenip yonettigini tutar.

Kullanici erisimi ve tenant bazli modul durumu icin:

- `public.tenant_memberships`: Workspace uyeligi ve varsayilan workspace bilgisi.
- `public.user_roles.instance_id`: Mevcut rol atamalarinin tenant ile iliskisi.
- `public.instance_modules`: Modullerin tenant seviyesindeki `enabled`, `readonly`, `disabled`, `beta` durumu.

## Pasif Davranis

`20260518_tenant_foundation.sql` migration'i su guvenli varsayimlarla gelir:

- Varsayilan tenant `00000000-0000-0000-0000-000000000000` olarak olusturulur.
- Mevcut is verileri bu varsayilan tenant ile backfill edilir.
- Is tablolarina `tenant_id` nullable olarak eklenir.
- Tenant filtreleme, RLS ve schema/database routing aktif edilmez.
- API client sadece varsa `x-eden-tenant-id` ve `x-eden-workspace-id` header'larini tasir.

## Aktivasyon Bayraklari

Bu bayraklar kapali kaldigi surece davranis degismez:

```env
EDEN_DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000000
EDEN_TENANCY_ISOLATION_MODE=shared_schema
EDEN_TENANT_COLUMN_WRITES=false
EDEN_TENANT_FILTERING=false
EDEN_TENANT_DATABASE_ROUTING=false
```

## Aktivasyon Sirasi

1. Tenant kayitlarini ve `tenant_company_scopes` iliskilerini gercek musteri/grup yapisina gore olustur.
2. Workspace secici UI ekle; secilen tenant sadece API header'i olarak tasinsin.
3. `EDEN_TENANT_COLUMN_WRITES=true` ile yeni kayitlara `tenant_id` yazimini modul modul ac.
4. Liste ve detay endpointlerine tenant filtresini modul bazinda ekle; sonra `EDEN_TENANT_FILTERING=true`.
5. Shared schema yeterliyse RLS politikalarini ekle. Musteri bazli ayrim gerekiyorsa `tenant_database_bindings` uzerinden dedicated schema/database routing'i aktive et.

## API Kontrati

Next API ve FastAPI ayni header'lari kabul eder:

```text
x-eden-tenant-id: <uuid>
x-eden-workspace-id: <uuid>
```

Mevcut tenant context bilgisi:

```text
GET /api/tenants/current
```

Bu endpoint workspace kaydini, database binding bilgisini ve hangi aktivasyon bayraklarinin acik oldugunu doner.
