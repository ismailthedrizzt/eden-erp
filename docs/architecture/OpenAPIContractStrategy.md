# OpenAPI Contract Strategy

FastAPI OpenAPI dokumani Eden ERP backend API sozlesmesinin source of truth'u olacaktir.

## Principles

1. Python FastAPI OpenAPI source of truth olacak.
2. Frontend TypeScript client OpenAPI'den uretilecek veya elle yazilmis wrapperlar kademeli kaldirilacak.
3. Next.js API routes migration surecinde frontend uyumlulugu icin proxy kalabilir; business logic Python'a tasinir.
4. Contract types iki tarafta elle cogaltilmayacak.
5. DTO alan adlari frontend/backend arasinda acikca belgelenecek.

## Tooling Options

- `openapi-typescript`
- `orval`
- custom lightweight client generator

Ilk tercih: FastAPI `/openapi.json` uzerinden TypeScript DTO ve fetch client uretmek. UI-specific response adapter gerekiyorsa Next BFF route'u generated client'i kullanir.

## Naming Rules

- API DTO field names English canonical snake_case veya documented JSON alias ile gelir.
- Turkish sadece user-facing label, helper text, legal names ve dokuman basliklarinda kullanilir.
- Eski payload aliases kabul edilmeyecek; gerekiyorsa explicit mapper/deprecation planina yazilir.
- `tenant` kelimesi kullanici mesajinda "calisma alani" olarak ifade edilir; API contract'ta internal field olarak kalabilir.

## Next.js Route Roles

Next.js API route'lari yalnizca su rollerden birine sahip olabilir:

1. BFF / proxy
2. UI-specific adapter
3. frontend-only helper endpoint

Yapmayacaklari:

- domain mutation
- process engine
- policy engine core
- operation orchestration
- transaction boundary
- outbox dispatch
- audit core write logic
- cross-domain business rule

## Client Generation Plan

1. FastAPI schemas Pydantic v2 ile tanimlanir.
2. `/openapi.json` CI artifact olarak uretilir.
3. TypeScript contract types `lib/generated/backend-client/types.ts` altina uretilir.
4. `lib/generated/backend-client/client.ts` hand-written adapter olarak response/error handling'i standartlastirir.
5. Existing manual service wrappers generated endpoint type'larini kullanarak kademeli olarak generated client'a delege eder.
6. Manual wrapperlar sadece UI-specific normalization ve Next BFF compatibility icin kalir.

Client generation ayrintilari [OpenAPI Client Generation](./OpenAPIClientGeneration.md)
dokumaninda tutulur. Mevcut hedef `lib/generated/backend-client/types.ts`
dosyasidir ve `npm run openapi:refresh` ile guncellenir.

CI `npm run openapi:refresh` calistirir ve `backend/openapi.json` ile
`lib/generated/backend-client/types.ts` drift olusturursa OpenAPI job fail eder.
Generated files elle duzenlenmez.

Step 12 itibariyla ilk adoption basladi: `companyService` public method
imzalari korunurken Company, Branch, Capital, Ownership ve Representative
Authority endpoint aileleri generated OpenAPI `paths` type'lari ile
isaretlendi. Detaylar [Generated OpenAPI Client Adoption](./GeneratedOpenAPIClientAdoption.md)
dokumaninda tutulur.

## Versioning

- `/api/v1` ilk public backend namespace.
- Breaking DTO degisikligi `/api/v2` veya explicit migration window gerektirir.
- Internal BFF route'lari FastAPI versiyonunu saklayabilir ancak source of truth OpenAPI olur.
