# Document Management / File Storage Product Spec

## Amac

Eden ERP belge altyapisi; dosya URL'lerini daginik JSON alanlarinda tutmak yerine belge metadata, storage referansi, iliski, durum, versiyon, requirement, signed URL ve audit bilgilerini merkezi Document domain altinda yonetir.

Bu kapsam tam DMS/ECM degildir. Ilk hedef guvenli yukleme, indirme, preview, belge gereksinimleri, kayit iliskileri ve moduller arasi ortak Document Loader standardidir.

## Kapsam

Document domain sahip olur:

- belge metadata
- storage bucket/path/provider teknik referansi
- belge turu ve kategorisi
- belge versiyonu
- belge durumu ve verification status
- belge-kayit iliskisi
- required/optional belge kurallari
- preview/download signed URL uretimi
- access log ve audit

Document domain sahip olmaz:

- sirket acilisi karar mantigi
- ortaklik veya temsil yetkisi transaction karari
- muhasebe transaction business logic
- servis kaydi sonucu
- import validation logic

## Document Model

Ana tablo: `documents`

Onemli alanlar:

- `tenant_id`, `company_id`, `branch_id`
- `owner_entity_type`, `owner_entity_id`
- `document_type`, `document_category`
- `title`, `description`
- `file_name`, `file_extension`, `mime_type`, `file_size`
- `storage_bucket`, `storage_path`, `storage_provider`
- `checksum`
- `version_no`, `parent_document_id`
- `status`: `draft`, `uploaded`, `verified`, `rejected`, `expired`, `archived`, `deleted`
- `verification_status`: `not_required`, `pending`, `verified`, `rejected`
- `required`, `issue_date`, `expiry_date`
- `uploaded_by`, `verified_by`, `verified_at`, `rejected_reason`
- `tags`, `metadata_json`
- `version`, `is_deleted`

Relation tablosu: `document_relations`

Relation type degerleri:

- `primary`
- `supporting`
- `evidence`
- `attachment`
- `generated_report`
- `import_file`
- `export_file`
- `service_photo`
- `identity_document`

Access log tablosu: `document_access_logs`

Action type degerleri:

- `view`
- `download`
- `preview`
- `upload`
- `delete`
- `verify`
- `reject`

## Storage Strategy

Storage path standardi:

```text
tenant/{tenant_id}/company/{company_id}/entity/{entity_type}/{entity_id}/{document_id}/{filename}
```

Kurallar:

- Raw `storage_path` teknik metadata olarak DB'de tutulur.
- UI ve audit cevaplarinda masked path gosterilir.
- Signed URL request aninda, kisa sureli uretilir.
- Signed URL audit log'a yazilmaz.
- Public bucket varsayilmaz.
- Download/preview oncesi backend auth, permission, tenant ve company scope kontrolu yapar.

## Document Requirements

`document_requirements` ve default registry birlikte kullanilir.

Desteklenen alanlar:

- `module_key`
- `operation_key`
- `entity_type`
- `document_type`
- `required`
- `condition_json`
- `accepted_file_types`
- `max_file_size`
- `expiry_required`
- `verification_required`

Ornekler:

- Sirket acilisi icin `trade_registry_gazette` required.
- Temsil yetkisi banka kapsami icin `bank_authority_document` required.
- Ise giris icin `identity_document` ve `sgk_entry_declaration` required.
- Servis kaydi icin `service_photo` optional.

## Document Loader

Merkezi component seti:

- `components/documents/DocumentLoader.tsx`
- `components/documents/DocumentSlot.tsx`
- `components/documents/DocumentPreview.tsx`
- `components/documents/DocumentRequirementList.tsx`
- `components/documents/DocumentStatusBadge.tsx`

Desteklenen davranislar:

- entity bazli belge fetch
- required/optional slot listesi
- dosya yukleme
- mobile camera upload
- preview/download signed URL
- replace/new version
- status badge
- missing required document gorunumu

## API Endpoints

Documents:

- `GET /api/v1/documents`
- `POST /api/v1/documents`
- `GET /api/v1/documents/{document_id}`
- `PATCH /api/v1/documents/{document_id}`
- `DELETE /api/v1/documents/{document_id}`

Upload and lifecycle:

- `POST /api/v1/documents/upload`
- `POST /api/v1/documents/{document_id}/new-version`
- `POST /api/v1/documents/{document_id}/verify`
- `POST /api/v1/documents/{document_id}/reject`
- `GET /api/v1/documents/{document_id}/download-url`
- `GET /api/v1/documents/{document_id}/preview-url`

By entity:

- `GET /api/v1/documents/by-entity/{entity_type}/{entity_id}`
- `POST /api/v1/documents/by-entity/{entity_type}/{entity_id}/upload`

Requirements and alerts:

- `GET /api/v1/documents/requirements`
- `GET /api/v1/documents/requirements/{module_key}/{operation_key}`
- `GET /api/v1/documents/expiring`
- `GET /api/v1/documents/expired`

Access logs:

- `GET /api/v1/documents/{document_id}/access-logs`

## Permissions

- `documents.view`
- `documents.upload`
- `documents.download`
- `documents.verify`
- `documents.reject`
- `documents.delete`
- `documents.admin`
- `documents.accessLogsView`

## Feature Flags

- `documents.enabled`
- `documents.preview`
- `documents.versioning`
- `documents.verification`
- `documents.accessLogs`
- `documents.mobileCameraUpload`
- `documents.requirements`
- `documents.signedUrlDownload`
- `documents.expiryAlerts`

## Audit

Audit action types:

- `document_upload`
- `document_download`
- `document_preview`
- `document_verify`
- `document_reject`
- `document_delete`
- `document_new_version`

Sensitive rule:

- `storage_path` masked yazilir.
- signed URL asla audit/log payload'ina yazilmaz.

## Acceptance Criteria

- Merkezi document model ve relation tablolari vardir.
- Upload, preview, download, verify/reject ve new-version endpointleri vardir.
- Signed URL uretimi permission ve scope kontrolu sonrasi yapilir.
- Document Loader merkezi service'e baglidir.
- Required document rules registry'de tanimlidir.
- Expiring/expired belgeler listelenir.
- Access log ve audit entegrasyonu vardir.
- Next proxy contract FastAPI source of truth ile calisir.
- Product spec, scenario ve E2E checklist vardir.

