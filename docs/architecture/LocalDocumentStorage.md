# Local Document Storage

The canonical storage provider is local filesystem storage on the remote server.

Files are addressed by controlled storage paths under the configured document storage root. Raw local filesystem paths are not exposed to the browser.

Security rules:

- Validate MIME, extension and size.
- Block executable/script extensions.
- Validate tenant scope in the storage path.
- Prevent path traversal with resolved common-path checks.
- Serve media only through authenticated FastAPI/BFF routes.
- Include the local storage root in backup and restore operations.
# Local Document Storage

Date: 2026-06-06

## Canonical Model

- `DOCUMENT_STORAGE_ROOT` server-only protected asset'tir.
- Dosya storage local filesystem'dadir.
- Fiziksel dosya identity'si `tenant_id + checksum` ile merkezi `document_files` kaydinda tutulur.
- `documents` belge metadata'sini ve is anlamini tasir.
- `document_relations` belgeyi kayit, islem, wizard veya slot baglamina baglar.
- Ayni tenant icinde ayni checksum fiziksel dosya reuse eder.
- Cross-tenant global dedup yapilmaz.

## Backup

`DOCUMENT_STORAGE_ROOT` PostgreSQL backup ile birlikte yedeklenmelidir. DB restore edilip dosya restore edilmezse document metadata gecersiz media path'e isaret eder.

## Security

- Path traversal engellenir.
- Storage path public URL olarak sunulmaz.
- Media access Next proxy + FastAPI route uzerinden olur.
- Raw storage path yerine masked path loglanir.
