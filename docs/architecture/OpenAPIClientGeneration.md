# OpenAPI Client Generation

FastAPI OpenAPI contract frontend/backend API sozlesmesinin source of truth'udur.

## Tooling

Scripts:

- `npm run openapi:export`: FastAPI app'ten `backend/openapi.json` uretir.
- `npm run openapi:generate`: `backend/openapi.json` dosyasindan
  `lib/generated/backend-client/types.ts` uretir.
- `npm run openapi:refresh`: export + generate islemini birlikte calistirir.

Generator:

- `openapi-typescript`

Generated target:

- `lib/generated/backend-client/types.ts`

Generated dosyalarin basinda `GENERATED_DO_NOT_EDIT` bulunur ve elle
duzenlenmez.

## Client Adapter

`lib/generated/backend-client/client.ts` mevcut gecis fazinda standart fetch/error
adapter'i saglar. `lib/backend/backendClient.ts` bu client'i merkezi import noktasi
olarak re-export eder.

Adapter hand-written tutulur; `types.ts` generated contract dosyasidir. Adapter
asagidaki ortak contractlari saglar:

- `BackendApiSuccess<T>`
- `BackendOperationResponse<T>`
- `BackendListResponse<T>`
- `BackendApiErrorBody`
- `normalizeBackendApiError`
- `unwrapBackendData`

Frontend servis wrapper'lari kademeli olarak:

1. Mevcut Next BFF route'unu cagirmaya devam eder.
2. Response/error handling'i ortak generated client adapter'ina yaklastirir.
3. FastAPI endpointleri frontend tarafindan direkt tuketilecekse generated types ile
   tiplenir.

## Route Strategy

- Browser client icin default yol Next BFF route'udur.
- Server-side veya internal adapter FastAPI'ye dogrudan gidebilir.
- Next BFF route'lari business logic tutmaz; auth/session/context aktarir ve FastAPI
  response'unu frontend contract'ina uyarlar.

## First Typed Endpoint Families

- Company list/detail
- Branch list/detail
- Capital increase
- Ownership transactions/current ownership
- Representative authority transactions/list projection

`lib/services/companyService.ts` bu aileleri `BackendPaths` uzerinden
tipleyerek manual DTO tekrarlarini azaltmaya baslamistir. Public service method
imzalari su asamada korunur; dogrudan generated client'a gecis P1 follow-up
olarak yapilacaktir.

Detayli adoption durumu [Generated OpenAPI Client Adoption](./GeneratedOpenAPIClientAdoption.md)
dokumanindadir.

## CI Follow-up

OpenAPI refresh henuz CI'da zorunlu degildir. P2 takip maddesi olarak:

- FastAPI schema export
- generated type diff kontrolu
- breaking change raporu

CI pipeline'ina eklenecektir.
