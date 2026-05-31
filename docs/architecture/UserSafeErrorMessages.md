# User-Safe Error Messages

## Amaç

Production'da kullaniciya teknik detay, secret, SQL, stack trace veya storage path gostermemek.

## Kullaniciya Gosterilmemesi Gerekenler

- SQL, table/column name, relation missing details.
- Stack trace, Python exception, Pydantic internals.
- JWT, token, secret, service role, signed URL.
- Raw storage path or provider path.
- PGRST/Postgres/asyncpg raw details.
- Migration/RPC missing raw exception.

## Safe Message Catalog

| Durum | Message | Code example |
| --- | --- | --- |
| Generic failure | `Islem tamamlanamadi. Lutfen tekrar deneyin.` | `INTERNAL_SERVER_ERROR` |
| Permission denied | `Bu islem icin yetkiniz bulunmuyor.` | `PERMISSION_DENIED` |
| Scope denied | `Bu kayit erisim kapsaminiz disinda.` | `SCOPE_DENIED` |
| Module missing | `Bu modulun kurulumu tamamlanmamis.` | `INFRASTRUCTURE_MISSING` |
| Backend down | `Backend servisine ulasilamadi.` | `BACKEND_UNAVAILABLE` |
| Guarded field | `Bu alan ilgili islem sihirbaziyla degistirilebilir.` | `FIELD_GUARDED` |
| Validation | `Gonderilen bilgiler kontrol edilmeli.` | `VALIDATION_ERROR` |

## Backend Standard

- `EdenError` and `HTTPException` responses must use `{ error, code, message, details, request_id, correlation_id }`.
- Production unexpected exception details are empty.
- Development may include debug details, but never secrets.
- Logs keep exception type and correlation id; user response remains safe.

## P0 Blockerlar

- Production stack trace visible.
- DB error visible to user.
- Secret/token/signed URL visible in response or logs.
