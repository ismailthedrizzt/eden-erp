# Document Deduplication And Reuse

<!-- source-of-truth-standard: contract overrides markdown -->

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
# Document Deduplication And Reuse

Date: 2026-06-06

## Canonical Behavior

1. Dosya alinir.
2. Dosya adi sanitize edilir.
3. MIME, uzanti ve boyut kontrol edilir.
4. SHA-256 checksum hesaplanir.
5. Ayni tenant icinde `document_files` kaydi aranir.
6. Ayni checksum varsa fiziksel dosya tekrar yazilmaz.
7. Yeni business meaning gerekiyorsa yeni `documents` kaydi olusturulur.
8. Yeni baglam icin `document_relations` kaydi olusturulur.
9. Ayni document/entity/operation/slot/relation varsa relation yeniden kullanilir.

## User Messages

- Yeni dosya: "Belge yuklendi."
- Reuse: "Belge eklendi. Mevcut dosya yeniden kullanildi."
- Belge turu celiskisi: "Belge eklendi. Ancak bu dosya daha once farkli bir belge turuyle kullanilmis. Kontrol etmeniz onerilir."
- Ayni slot/idempotent: "Belge zaten bu alana eklenmis."

## User-facing Language

Do not show these words in product UI:

- checksum
- hash
- storage path
- duplicate record

## Tenant Rule

Reuse is same-tenant only. There is no global/cross-tenant deduplication.
