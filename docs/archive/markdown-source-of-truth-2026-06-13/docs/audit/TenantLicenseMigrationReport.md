# Tenant License Migration Report

Date: 2026-06-07

## Migration

Migration draft: `backend/migrations/versions/20260607_0100_product_plan_tenant_licensing.py`

Physical table names avoid conflict with the existing Product Services catalog:

- `licensed_products`
- `product_license_plans`
- `plan_modules`
- `plan_features`
- `tenant_licenses`
- `tenant_license_modules`
- `tenant_license_features`
- `tenant_license_payments`
- `tenant_usage_snapshots`

## Seed

Seed creates product `eden_erp` and plans:

- `development`
- `micro`
- `small`
- `medium`
- `large`
- `enterprise`

Existing tenants discovered through `workspace_settings` receive a safe `medium` fallback license when they do not already have an active license for EDEN ERP.

## Compatibility

- Existing tenant/ERP instance tables are not modified.
- Existing Product Services `product_catalog` is not renamed or reused.
- If licensing tables are not migrated yet, backend current entitlement falls back to `medium` and returns a warning.

## Open Items

- Confirm EDEN Teknoloji vendor tenant ID and store it in configuration or tenant metadata.
- Classify demo/test tenants before assigning `development`.
- Decide whether unknown customer tenants should default to `small` or `medium`; this migration uses `medium` to avoid accidental module loss.

