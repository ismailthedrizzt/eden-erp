# Document Registry

Eden ERP stores documents once in the central `documents` registry and reuses them by reference from all modules.

## Core Rule

Do not duplicate files. A file uploaded as an `İmza Sirküleri`, `Sözleşme`, `Vekaletname`, identity document, board decision, or another legal document must be reused through `document_links` when it is needed by another record.

Examples:

- Company legal document: `linked_module = companies`, `link_type = company_legal_document`
- Representative authority basis: `linked_module = representatives`, `link_type = authority_basis`
- Partner document: `linked_module = partners`, `link_type = partner_document`
- Accounting or bank authorization: `linked_module = accounting`, `link_type = authority_basis`

## Tables

`documents` contains document metadata:

- `company_id`
- `document_type`
- `document_title`
- `document_no`
- `issue_date`
- `expiry_date`
- `issuing_authority`
- `status`
- `confidentiality_level`
- audit fields, soft delete fields, and `version`

`document_files` contains private storage metadata and immutable file versions:

- `document_id`
- `storage_path`
- `file_name`
- `mime_type`
- `file_size`
- `file_hash`
- `version_no`
- `is_current_version`

Old versions are never deleted. A new file version marks the previous version as not current.

`document_links` connects one document to any module record:

- `document_id`
- `linked_module`
- `linked_record_id`
- `link_type`
- `notes`
- soft delete fields

Unlinking passivates the link. It does not delete the document or file.

## Document Types

Supported document types are:

- Vergi Levhası
- İmza Sirküleri
- Ticaret Sicil Gazetesi
- Faaliyet Belgesi
- Vekaletname
- Yönetim Kurulu Kararı
- Ortaklar Kurulu Kararı
- Sözleşme
- Ruhsat
- Kimlik
- Pasaport
- Diğer

## Representative Example

When a user creates a representative authority and chooses an existing `İmza Sirküleri`, the system creates only a link:

```text
document_id = selected document
linked_module = representatives
linked_record_id = representative authority record id
link_type = authority_basis
```

No new file upload occurs.
