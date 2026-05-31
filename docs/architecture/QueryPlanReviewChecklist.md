# Query Plan Review Checklist

## Amaç

Production oncesi kritik query'lerin PostgreSQL planlarini standart bir sekilde incelemek icin kullanilir.

## Hazirlik

- Staging verisi en az pilot hacminin 3 kati olmalidir.
- Her testte gercek tenant_id ve company_id kullanilir.
- `EXPLAIN (ANALYZE, BUFFERS, VERBOSE)` ciktilari release klasorunde saklanir.
- Query oncesi ve sonrasi DB connection, CPU ve lock bekleme metrikleri not edilir.

## Kritik Query Listesi

| Query | Beklenen predicate | Kabul kriteri |
| --- | --- | --- |
| company list | tenant, deleted/status, sort | index/bitmap scan, p95 < 500ms |
| branch list | tenant + company + status | no tenant-wide seq scan |
| partner current ownership | tenant + company + effective date | stable under history growth |
| representative current authority | tenant + company/branch + status | current-state index |
| action center | tenant + status/due/failed | bounded per source |
| audit list | tenant + created_at desc | no full audit scan |
| reporting dashboard | tenant + company + module | cached/aggregated where needed |
| global search | tenant + exact/prefix identifiers | no unbounded ilike on hot tables |
| document list | tenant + owner/company/status | storage metadata scoped |
| bank reconciliation | tenant + company + reconciliation status | date/status index |
| task list | tenant + assignee/status/due | action center friendly |
| service requests | tenant + company/customer/status | priority/date index |
| portal product list | tenant + customer/company + active | no internal products leak |

## Review Steps

1. Capture SQL from backend logs or SQLAlchemy echo in staging.
2. Replace bind variables with fixture tenant/company ids.
3. Run `EXPLAIN (ANALYZE, BUFFERS)` twice; discard cold-cache first run unless testing cold start.
4. Check scan type, estimated vs actual rows, buffer hits/read, sort method and temp file usage.
5. If query reads tenant-disallowed rows before filtering, create a tenant-leading composite index.
6. If sort spills to disk, add order-compatible index or page by indexed cursor.
7. Record result, query hash, index recommendation and owner.

## Red Flags

- `Seq Scan` on audit, outbox, document, process, reporting export or integration delivery tables.
- `Rows Removed by Filter` much larger than returned rows for tenant/company predicates.
- `Sort Method: external merge`.
- Query waits on lock from migration or worker transaction.
- Exact search uses `%term%` on large table without dedicated search strategy.
