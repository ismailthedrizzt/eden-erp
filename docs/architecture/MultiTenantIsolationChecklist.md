# Multi-Tenant Isolation Checklist

## Amaç

Bu checklist Eden ERP'nin her production isteginde tenant izolasyonunu kanitlamak icin kullanilir. Canonical guvenlik karari FastAPI tarafindadir; Next.js BFF yalnizca token, cookie ve proxy baglamini tasir.

## Final Gate

Production gecisi icin asagidaki kosullar saglanmis olmalidir:

- Her domain tablosunda tenant ayirt edici kolon veya tenant'a baglanan zorunlu sahiplik zinciri bulunur.
- Her FastAPI query, mutation, report, search, audit, document, notification, import/export ve integration endpoint'i `RequestContext.tenant_id` ile calisir.
- Next BFF'den gelen `x-tenant-id`, `x-user-id`, `x-company-scope` ve permission header'lari production'da tek basina guvenilir kabul edilmez.
- JWT kullanici kimligi tenant membership, role ve scope kaynaklarindan tekrar cozulur.
- Worker job, outbox event, webhook delivery, email, notification ve scheduled report kayitlari tenant_id tasir.
- Cache, signed URL, document path ve export dosyasi tenant disina cikamaz.

## Kontrol Matrisi

| Alan | Production beklentisi | Kanit / kontrol | Gate |
| --- | --- | --- | --- |
| Ana tablolar | `tenant_id` ya da tenant'a bagli sahiplik zinciri | Migration inventory ve `information_schema.columns` kontrolu | P0 |
| FastAPI list/query | `where tenant_id = :tenant_id` veya policy helper | Domain service static review, tenant regression test | P0 |
| FastAPI mutation | Insert tenant stamp, update/delete tenant predicate | Mutation testleri ve SQL review | P0 |
| Next BFF | Header proxy, karar merkezi degil | `TRUSTED_PROXY_SECRET` ve backend JWT verification | P0 |
| JWT membership | User tenant membership backend'de dogrulanir | `resolve_tenant_id`, `load_effective_permissions`, `load_company_scope` | P0 |
| Search | Sonuclar tenant ile filtreli | Search endpoint fixture testleri | P0 |
| Report/dashboard | KPI ve export tenant scoped | Reporting service review | P0 |
| Audit | Audit list/export tenant scoped | Audit API review | P0 |
| Documents | Storage path ve signed URL tenant scoped | Document download/upload smoke | P0 |
| Notifications | Hedef kullanici tenant ve company scope icinde | Notification service review | P0 |
| Import/export | Job, row ve output tenant scoped | Export download test | P0 |
| Integration/webhook | App, credential, delivery ve inbound event tenant scoped | Integration hub tests | P0 |
| Workers | Worker tenant_id ile calisir; global batch sadece tenant predicate ile isler | Worker code review | P0 |
| Outbox | Envelope `tenant_id`, `event_id`, correlation tasir | Outbox migration/service review | P0 |
| Cache | Key icinde tenant/session/workspace vardir | `serverResponseCache` contract guard | P0 |

## P0 Blockerlar

- Query/mutation icinde tenant predicate eksik.
- Search, report, export veya document download ile baska tenant verisi gorunur.
- Worker tenant disi event/delivery/email isler.
- Shared cache tenant/session ayirmadan cevap dondurur.
- Service role veya internal token client tarafina sizar.
- Production'da trusted proxy header secret olmadan kabul edilir.

## Test Hazirligi

- Iki tenant, iki kullanici, iki company fixture'i hazirla.
- Tenant A kullanicisi ile Tenant B company, document, audit, export ve search endpointlerine 403/404 bekle.
- Worker smoke'ta Tenant A outbox event'inin Tenant B webhook subscription'ina delivery olusturmadigini dogrula.
- Export dosyasinin metadata ve storage path'inin tenant prefix'i tasidigini dogrula.

## Release Karari

Bu checklist'teki herhangi bir P0 maddesi belirsizse release sonucu `PILOT_ONLY` veya `NOT_READY` olmalidir. Production release oncesi kanitlar `docs/release/ProductionReadinessReport.md` icinde ilgili bolume baglanir.
