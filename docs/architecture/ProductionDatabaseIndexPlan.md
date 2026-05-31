# Production Database Index Plan

## Amaç

Bu plan Eden ERP'nin tenant/company scoped listeler, audit, outbox, process, document, reporting, integration ve module KPI query'leri icin production index standardini tanimlar.

## Rollout Kurallari

- Hot path indexleri `tenant_id` ile baslar; company scoped query'lerde ikinci kolon genellikle `company_id` olur.
- Buyuk tablolarda production uygulama icin `CREATE INDEX CONCURRENTLY` varyanti ayrica hazirlanir; transaction-wrapped migration runner icinde normal `CREATE INDEX IF NOT EXISTS` kullanilir.
- Her index icin `EXPLAIN (ANALYZE, BUFFERS)` staging verisiyle kontrol edilir.
- Geri alma etkisi genellikle index drop'tur; veri kaybi olmaz fakat query latency artabilir.
- Yeni index migration'i table/column-gated olmalidir; partial staging veritabaninda kirilmamalidir.

## Kritik Index Alanlari

| Alan | Index hedefi | Not |
| --- | --- | --- |
| Tenant/company core | `(tenant_id, company_id, status/updated_at)` | Company, branch, partner, representative, employee |
| Audit | `(tenant_id, created_at desc)`, `(tenant_id, action_key, created_at desc)`, `(tenant_id, user_id, created_at desc)` | Audit list/export |
| Outbox | `(tenant_id, status, created_at)`, `(tenant_id, event_type, created_at)`, stale lock | Worker/admin backlog |
| Process/tasks | `(tenant_id, status, due_at)`, assignee/status | Action Center |
| Documents | `(tenant_id, owner_entity_type, owner_entity_id)`, status/expiry | Document list/download |
| Search | tenant + exact identifiers | Tax number, title, serial, invoice |
| Accounting | company + reconciliation status/date | Bank/e-document reconciliation |
| CRM | company + stage/status/owner | Lead/opportunity boards |
| After-sales | company/customer/status/priority | Service requests and maintenance |
| HR | company + employee/status/date | Attendance, leave, payroll prep |
| Reporting | scheduled next run, export status, saved view owner | Reporting worker |
| Integration | delivery status/next attempt, inbound source event | Webhook worker/idempotency |

## Migration Artifact

Existing baseline: `supabase/migrations/20260528_performance_indexes.sql`.

Final hardening addition: `supabase/migrations/20260531_production_hardening_indexes.sql`.

Bu migration table ve column varligini kontrol eder, `CREATE INDEX IF NOT EXISTS` kullanir ve production'da buyuk tablolar icin concurrently notu icerir.

## EXPLAIN Hedefleri

- Hot list query'lerde sequential scan kabul edilmez; tenant/company predicate index scan veya bitmap index scan kullanmalidir.
- Audit/outbox/reporting gibi buyuyen tablolarda `rows removed by filter` tenant disi veri icin yuksekse yeni composite index gerekir.
- Query p95 hedefi local/staging smoke icin 500-800ms, production normal yukte API p95 icin 800ms altidir.

## P0 Blockerlar

- Tenant/company hot query'leri unbounded sequential scan yapiyor.
- Outbox/audit/action center query'leri buyuyen tabloda indexsiz.
- Export/report worker'i primary API pool ve DB kaynaklarini tuketecek sekilde sinirsiz calisiyor.
