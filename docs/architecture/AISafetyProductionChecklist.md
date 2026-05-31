# AI Safety Production Checklist

## Amaç

AI features must help users without bypassing Eden ERP policy, scope, audit, document or critical-operation controls.

## Checklist

- AI cannot directly execute critical mutations.
- Actions are constrained to registry keys.
- Permission, readiness, field-control and integrity guards decide enabled/disabled state.
- Tenant and company scope are applied before context collection.
- Prompts never include raw secrets, signed URLs, service role keys or storage paths.
- Sensitive data is masked where summary does not require exact value.
- Provider fallback is safe and deterministic.
- AI history retention is bounded by tenant policy.
- Accepted AI suggestions and action previews are audited.

## P0 Blockerlar

- AI summarizes unauthorized tenant/company data.
- AI suggests or enables an action that backend policy denies.
- AI executes critical operation without wizard and explicit user confirmation.
- Prompt/log contains secret or raw signed URL.

## Verification

Run negative tests for scope-denied context, permission-denied action preview, critical operation request, document summary with signed URL, and provider failure fallback.
