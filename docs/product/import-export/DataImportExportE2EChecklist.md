# Data Import / Export E2E Checklist

## Seed

- Active company.
- Existing customer VKN and cari account code.
- Sample CSV and XLSX files for cari, stakeholder, product, employee draft and project task.
- Project tasks for bulk assignment.
- User roles: import creator, import confirmer, export user, bulk confirmer, unauthorized user.

## Import

- Template list loads.
- Cari Kart template downloads as CSV.
- CSV upload creates job and moves to mapping.
- XLSX upload parses rows when `openpyxl` is available.
- Mapping suggestions populate target fields.
- Missing required field blocks validation/import.
- Duplicate account_code or tax_number appears as duplicate/warning.
- Operation-controlled field is rejected.
- Error report downloads.
- Confirm imports only valid/warning rows.
- Duplicate rows are skipped when `skip_duplicates=true`.
- Result summary shows imported, skipped and failed counts.

## Export

- Dataset selector lists MVP export datasets.
- Current filters are sent to export job.
- Column selection is applied.
- Sensitive data is masked without explicit permission.
- Export job completes and download returns CSV.
- Export create/download audit entries exist.

## Bulk

- Bulk dry-run creates `ready_to_confirm` job.
- Max batch size is enforced.
- Permission denied returns controlled error.
- Scope denied row fails or is skipped.
- Operation-controlled/lifecycle controlled fields are blocked.
- Confirm result includes per-row success/failed/skipped.

## Regression

- Unauthorized user cannot access import confirm.
- Unauthorized user cannot create export.
- Backend technical errors are not shown raw to users.
- Action Center shows validation errors, export ready, and bulk completed/failed items when tables exist.
- OpenAPI drift check includes import/export/bulk endpoints.

## Optional Playwright Spec

Create `tests/e2e/data-import-export.spec.ts` when Playwright is installed. Cover:

- Template download.
- File upload.
- Mapping.
- Validation errors.
- Import confirm.
- Import result.
- Export create/download.
- Bulk action dry-run.
- Bulk action confirm.
- Permission denied.
- Operation-controlled field rejected.
