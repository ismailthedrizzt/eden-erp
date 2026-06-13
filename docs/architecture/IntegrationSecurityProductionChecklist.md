# Integration Security Production Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Amaç

Integration app, credential, inbound webhook and outbound webhook surfaces must be tenant scoped, signed, replay-resistant and SSRF-safe.

## Checklist

| Area | Requirement | Severity |
| --- | --- | --- |
| Secrets | Hash at rest, once shown, no logs | P0 |
| Inbound signature | Required for every inbound event | P0 |
| Replay protection | Timestamp window and source event idempotency | P0 |
| Tenant scope | App, credential, inbound event, delivery scoped by tenant | P0 |
| Target URL | HTTPS in production | P0 |
| SSRF | Private/loopback/link-local blocked in production | P0 |
| Header safety | No auth/secret custom headers in stored config | P0 |
| Rate limiting | Per app/key plan before public exposure | P1 |
| Retry/dead-letter | Bounded retry and admin visibility | P1 |
| Audit | Credential changes, inbound reject, retry/dead-letter | P1 |

## P0 Blockerlar

- Unsigned inbound webhook accepted.
- Secrets plaintext visible after creation/rotation.
- Webhook target can hit private/internal network in production.
- Integration app can bypass tenant or company scope.
- Secret, token or full payload logged.

## Production Gate

Inbound endpoints must be tested with valid signature, invalid signature, stale timestamp and duplicate source event id. Outbound delivery must be tested against HTTPS success, 5xx retry and dead-letter path.
