# Generated OpenAPI Client Adoption

## Summary

Step 12 ile FastAPI OpenAPI contract'i TypeScript frontend icin somut source of
truth olarak kullanilmaya basladi. Generated schema dosyasi elle
duzenlenmez; hand-written adapter response/error handling'i tek noktada toplar.

## Current Shape

- `backend/openapi.json`: FastAPI app'ten export edilen contract snapshot.
- `lib/generated/backend-client/types.ts`: `openapi-typescript` ile uretilen
  generated contract dosyasi.
- `lib/generated/backend-client/client.ts`: hand-written fetch adapter ve ortak
  response envelope type'lari.
- `lib/backend/backendClient.ts`: frontend/backend importlari icin merkezi
  re-export noktasi.

## Adopted Contracts

`companyService` su endpoint ailelerini generated `BackendPaths` ile
isaretlemeye basladi:

- Company list/detail
- Branch list/detail
- Current ownership
- Capital increase
- Ownership transactions
- Representative authority transactions

Bu fazda public service method imzalari korunur. Frontend sayfalari halen
mevcut Next BFF route contract'ini kullanir.

## Response Standard

Adapter ortak type'lari:

- `BackendApiSuccess<T>`
- `BackendOperationResponse<T>`
- `BackendListResponse<T>`
- `BackendApiErrorBody`
- `normalizeBackendApiError`
- `unwrapBackendData`

Bu type'lar manual DTO tekrarini azaltmak ve endpoint ailesi bazinda generated
contract adoption'ini kolaylastirmak icin kullanilir.

## Next Steps

P1:

- Company/branch/partner/representative service methodlarini generated endpoint
  response/request type'lariyla daha dar tipleyerek manual `any` kullanimini
  azalt.
- Next BFF proxy route'larinda response adapter tekrarlarini ortak helper'a
  indir.
- CI'da `npm run openapi:refresh` diff kontrolu ekle.

P2:

- Uygun server-side adapterlarda generated client'i dogrudan FastAPI'ye
  bagla.
- Generated endpoint enum/permission/event contractlarini shared package'a
  ayir.
