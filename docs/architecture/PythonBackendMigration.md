# Python Backend Migration

<!-- source-of-truth-standard: contract overrides markdown -->

Bu dokuman Eden ERP'nin Python/FastAPI core backend gecisinin ana giris belgesidir. Eden ERP yeni tasarlanan bir platformdur; eski davranislar kalici uyumluluk gerekcesiyle korunmaz. Yalnizca canli gecis kopruleri `proxy_to_fastapi_with_legacy_fallback`, `deprecated_wrapper` veya ilgili migration status'u ile planli sureyle kalabilir.

## Hedef Mimari

- Frontend: Next.js 15, React 19, TypeScript ve Tailwind CSS.
- BFF / Adapter: Next.js API route'lari gecis surecinde proxy/adaptor veya UI-specific endpoint rolundedir.
- Core Backend: FastAPI / Python, Pydantic v2, SQLAlchemy 2 veya SQLModel, Alembic ve background worker altyapisi.
- Database/Auth/Storage: Supabase/PostgreSQL, Supabase Auth ve Supabase Storage. Supabase backend degil, altyapi platformudur.
- Contracts: FastAPI OpenAPI sozlesmesi source of truth olur; TypeScript client/type katmani OpenAPI'den uretilir.

## Tasima Kapsami

Asagidaki TypeScript backend mantiklari kalici backend degildir ve Python'a tasinacaktir:

- operation orchestrator'lar
- transaction boundary / RPC wrapper mantigi
- process engine
- policy ve scope engine
- integrity checks
- audit log service
- outbox dispatcher ve event services
- setup readiness checker
- read-model server query helperlari
- domain services

TypeScript tarafinda kalacak alanlar:

- React componentleri ve UI helperlari
- frontend store'lari
- API client wrapper'lari
- frontend-only form normalization
- OpenAPI'den uretilmis contract tipleri

## Gecis Adimlari

1. FastAPI scaffold kurulur ve health endpointleri calisir hale gelir.
2. Codebase inventory ve obsolete audit ile TS backend mantigi siniflandirilir.
3. P0 operasyonlar Python endpointlerine tasinir.
4. Next.js API route'lari ayni frontend contract'i koruyarak FastAPI proxy/adaptor haline indirilir.
5. OpenAPI generated TypeScript client devreye alinir.
6. TS domain/orchestrator/process/outbox/audit/policy/integrity dosyalari deprecation planina gore silinir veya contract/shared tipe indirgenir.

## Ilk P0 Hedefleri

1. Branch opening/closing
2. Company official changes
3. Capital increase
4. Representative authority transactions
5. Ownership transactions

Bu siralama [Python Migration Roadmap](./PythonMigrationRoadmap.md) dokumaninda ayrintilandirilir.

## Migration Status Standardi

TS backend veya gecis koprusu dosyalari su header ile isaretlenir:

```ts
// BACKEND_MIGRATION_STATUS: proxy_to_fastapi_with_legacy_fallback
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/branches
// NOTES: Proxies to FastAPI when configured; TS fallback is temporary migration bridge.
```

Gecerli status degerleri:

- `keep_frontend`
- `keep_bff_proxy`
- `proxy_to_fastapi`
- `proxy_to_fastapi_with_legacy_fallback`
- `proxy_to_fastapi_with_temporary_fallback`
- `keep_ui_adapter`
- `keep_session_bootstrap`
- `keep_upload_adapter`
- `keep_temporary_fallback`
- `migrate_to_fastapi`
- `migrate_to_fastapi_then_proxy`
- `delete_obsolete`
- `deprecated_wrapper`
- `contract_endpoint`
- `contract_shared`
- `keep_shared_contract`
- `keep_generated`
- `generated_do_not_edit`

## Final Consolidation Rule

Step 19 makes FastAPI the canonical core backend in code review terms as well as runtime architecture. New ERP domain behavior must be implemented under `backend/app/**`. Next.js API routes may only:

- proxy to FastAPI,
- adapt frontend/session/upload concerns,
- keep explicitly documented temporary fallbacks,
- expose shared/generated contracts.

Use `npm run migration:status`, `npm run boundaries:check`, and `npm run ts-backend:inventory` before accepting new backend-facing TS changes.

## Ilgili Dokumanlar

- [Codebase Inventory](./CodebaseInventory.md)
- [Legacy / Obsolete Code Audit](./LegacyObsoleteCodeAudit.md)
- [Python Migration Map](./PythonMigrationMap.md)
- [Python Migration Roadmap](./PythonMigrationRoadmap.md)
- [OpenAPI Contract Strategy](./OpenAPIContractStrategy.md)
- [Scaling Architecture](./ScalingArchitecture.md)
- [Next Cleanup Plan](./NextCleanupPlan.md)
- [Remaining TS Backend Inventory](./RemainingTsBackendInventory.md)
- [TS Backend Removal Report](./TsBackendRemovalReport.md)
