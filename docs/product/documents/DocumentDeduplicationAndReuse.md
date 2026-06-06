# Document Deduplication And Reuse

Users upload documents where they need them: a form, card, wizard or service record. They do not choose an existing central document first.

## Rule

When a file is uploaded:

- The file name is sanitized.
- MIME, extension and size are validated.
- SHA-256 checksum is calculated.
- The backend searches `document_files` by `tenant_id + checksum`.
- If found, the physical file is not written again.
- A new `documents` metadata row and `document_relations` row can be created for the current context.
- If not found, the file is written to local storage and a new `document_files` row is created.

Tenant boundaries are strict. There is no cross-tenant deduplication.

## User Message

Normal upload:

`Belge eklendi.`

Duplicate reuse:

`Belge eklendi. Bu dosya daha once sisteme yuklendigi icin mevcut dosya yeniden kullanildi.`

Type conflict:

`Belge eklendi. Ancak bu dosya daha once farkli bir belge turuyle kullanilmis. Kontrol etmeniz onerilir.`
