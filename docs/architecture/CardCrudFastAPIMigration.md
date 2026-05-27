# Company / Partner / Representative Card CRUD FastAPI Migration

Status: Step 13 implemented as a migration bridge.

## Migrated Endpoints

- `GET /api/v1/companies`
- `POST /api/v1/companies`
- `GET /api/v1/companies/{company_id}`
- `PATCH /api/v1/companies/{company_id}`
- `DELETE /api/v1/companies/{company_id}`
- `GET /api/v1/partners`
- `POST /api/v1/partners`
- `GET /api/v1/partners/{partner_id}`
- `PATCH /api/v1/partners/{partner_id}`
- `DELETE /api/v1/partners/{partner_id}`
- `GET /api/v1/representatives`
- `POST /api/v1/representatives`
- `GET /api/v1/representatives/{representative_id}`
- `PATCH /api/v1/representatives/{representative_id}`
- `DELETE /api/v1/representatives/{representative_id}`

## Card CRUD vs Operations

Card CRUD is limited to identity, contact, profile, document metadata, notes, and other card-level fields.

Official or transaction-producing changes remain in operation endpoints:

- Company opening, liquidation, deregistration, title, address, NACE, activity subject, and capital changes are not card PATCH.
- Ownership rights are not partner card PATCH.
- Representative authority, scope, limit, suspension, and termination are not representative card PATCH.

## Draft Standard

`+ Ekle` creates a draft card:

- Company: `record_status = draft`, `company_status = draft`
- Partner: `record_status = draft`, ownership fields are not set
- Representative: `record_status = draft`, authority fields are not set

## Field Control

`backend/app/policies/field_control.py` is the shared Python guard for operation-controlled fields. It returns:

```json
{
  "error": "Bu alanlar ilgili islem sihirbazi ile degistirilebilir.",
  "code": "OPERATION_CONTROLLED_FIELDS",
  "details": {
    "fields": [
      { "field": "share_ratio", "label": "Pay orani", "operation": "Ortaklik Islemi" }
    ]
  }
}
```

Draft company cards can edit limited identity/address fields, but capital and lifecycle fields remain strictly operation-controlled.

## Hard Delete Guard

`backend/app/policies/delete_guards.py` allows hard delete only for safe drafts:

- Draft company with no related partners, representatives, branches, lifecycle, official change, or ownership transaction records
- Draft partner with no ownership history/current ownership
- Draft representative with no authority history/current authority

Active or historical records must use the relevant operation flow.

## Next Proxy Behavior

Next.js CRUD routes stay as BFF/proxy routes:

- `/api/companies`
- `/api/companies/[company_id]`
- `/api/companies/partners`
- `/api/companies/partners/[id]`
- `/api/companies/representatives`
- `/api/companies/representatives/[id]`

When `FASTAPI_BASE_URL` is set, these routes proxy to FastAPI. Without it, legacy TS fallback remains as an explicit migration bridge.

## Known Gaps

- Master identity synchronization is still partly handled by legacy fallback and needs Python hardening.
- Document upload/storage adapters remain a later Python migration.
- Full frontend generated OpenAPI client replacement remains staged.
- Legacy TS card fallbacks should be removed after staging verification.
