# Caching Strategy

<!-- source-of-truth-standard: contract overrides markdown -->

Caching must not weaken tenant, permission or operation correctness.

## Safe Cache Candidates

- Permission registry definitions.
- Module readiness definitions.
- Action definitions and static action guide registry.
- Tenant/module settings with short TTL and explicit invalidation.
- Reference data such as NACE, tax offices and locations.

## Careful Cache Candidates

- List projection responses may be cached only by tenant, user/scope, filters, sort and page.
- Company/branch summary widgets need projection invalidation.
- Current ownership/current authority reads must honor operation completion invalidation.

## Do Not Cache By Default

- Operation mutation endpoints.
- Precheck results unless they are very short lived and tied to exact input/version.
- Audit/outbox/process active queue queries.
- Permission denials without considering current user/tenant/scope.

## Future Runtime

- Redis can back tenant/module/reference caches later.
- Next/SWR cache must align with FastAPI projection invalidation.
- Outbox projection invalidation handler is the preferred cross-service signal.
