# Security Incident Runbook

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

Auth bypass, tenant data exposure, secret leak, unsafe portal access, unsigned webhook acceptance or AI data exposure icin security response.

## Kim Kullanir

Security owner, incident commander, engineering lead, support lead.

## Immediate Containment

1. Declare P0 unless impact is proven isolated.
2. Freeze deploys and preserve logs.
3. Disable exposed route/feature flag or block at firewall/proxy.
4. Rotate suspected secrets/tokens.
5. Pause workers if they may continue leakage.
6. Identify tenants, users, records and time window.
7. Start legal/privacy communication path.

## Investigation

- Collect request ids, auth claims, tenant ids, company ids.
- Compare expected policy with observed access.
- Inspect audit logs for read/download/export/admin actions.
- Inspect document signed URL and storage access logs.
- Inspect integration inbound/outbound payloads and headers.
- Inspect AI prompts/history for sensitive leakage.

## Recovery

- Patch policy/scope bug.
- Add regression test.
- Rotate secrets and invalidate sessions where needed.
- Re-run tenant/scope negative smoke.
- Communicate confirmed impact and remediation.

## P0 Requirement

Tenant data exposure procedure must exist before production. This runbook is the mandatory procedure; do not ship production without an on-call owner and communication route.

## Audit/Log Referanslari

- Auth logs, permission denied spikes.
- Audit export/download/admin actions.
- Request logs with tenant/user ids.
- Integration credential audit.
