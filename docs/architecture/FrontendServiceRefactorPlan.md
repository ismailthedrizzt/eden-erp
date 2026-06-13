# Frontend Service Refactor Plan

<!-- source-of-truth-standard: contract overrides markdown -->

Frontend services are API client adapters. They may normalize frontend form shape, unwrap backend response envelopes and provide toast-friendly errors, but they must not contain ERP domain decisions.

## Current State

- `lib/services/companyService.ts` remains the public compatibility wrapper for company, branch, partner, representative, capital and ownership UI flows.
- The wrapper keeps existing page contracts stable while Next BFF routes proxy or temporarily fall back.
- Generated OpenAPI types are available from `lib/generated/backend-client/types.ts` and re-exported through backend client adapters.

## Target State

- Service methods call Next BFF routes or a generated backend client adapter.
- Backend DTO shape comes from the FastAPI OpenAPI contract.
- Business validation, policy, readiness, integrity and operation eligibility stay in FastAPI.
- Frontend validation is limited to UX affordances such as required field hints, empty-string cleanup and local form state.

## Allowed In Frontend Services

- endpoint wrapper methods
- UI payload shape normalization
- `''` to `null` cleanup
- response envelope unwrapping
- field error mapping for EntityForm
- request cancellation and retry behavior for safe GET requests

## Not Allowed

- DB table knowledge
- operation state machines
- current ownership calculations
- representative authority status calculations
- policy enforcement
- readiness checks
- integrity blocking decisions
- process/outbox/audit runtime writes

## Migration Steps

1. Keep public method names stable for pages.
2. Type endpoint families with generated OpenAPI `paths`.
3. Replace manual DTO copies with generated schema types where available.
4. Move any remaining domain validation into FastAPI endpoints.
5. Delete TS fallback mappers after staging and E2E verification.

## P1 Follow-Ups

- Replace company/partner/representative/branch manual response types with generated contracts.
- Remove ownership/current authority calculations from TS fallbacks.
- Move process/audit/action-center service wrappers to generated backend client calls.
- Add `boundaries:check --strict` once temporary fallbacks are removed.
