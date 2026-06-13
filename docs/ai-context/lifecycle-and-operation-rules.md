# Lifecycle and Operation Rules

Status: canonical AI context
Updated: 2026-06-13

Lifecycle/status mutation must be operation-controlled. Direct updates to fields such as `record_status`, `employment_status`, `lifecycle_status`, `workflow_status`, `authority_record_status`, `ownership_status`, or `company_status` require visible operation, transaction, or event evidence.

## Required Sequence

```text
operation request or operation id
-> domain validation
-> lifecycle transaction/event insert with non-null operation_id or process_instance_id
-> master/projection status update
-> typed response
```

## Guard

`npm run contract:lifecycle` scans lifecycle contracts and backend files. If a guard fails, fix architecture or improve precise detection for a true false positive. Do not silence the guard.

## Primary References

- `contracts/lifecycle/**`
- `backend/app/domains/**`
- `docs/architecture/record-lifecycle.md`
- `scripts/check-lifecycle-operation-guard.js`

## Related Contracts

- `contracts/lifecycle/**`
- `contracts/core/lifecycle.contract.ts`

## Related Guards

- `scripts/check-lifecycle-operation-guard.js`
- `npm run contract:lifecycle`
