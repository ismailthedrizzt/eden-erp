# Audit Reliability And Retention Policy

<!-- source-of-truth-standard: contract overrides markdown -->

## Amaç

Critical mutation, security event, export/download ve admin operasyonlarinda denetim izinin kaybolmamasini ve hassas veri sizdirmamasini saglamak.

## Auditlenmesi Zorunlu Olaylar

- Company lifecycle, official change, capital, ownership, representative ve branch critical mutations.
- Permission denied, scope denied ve auth/security configuration failures.
- Admin users/roles, feature flags, module activation, integration credential changes.
- Export, document download/signed URL, verify/reject/delete.
- Portal access, portal document/service request actions.
- Integration inbound reject/accept, webhook retry/dead-letter.
- AI suggestions, action previews and accepted form assist.

## Reliability Standardi

- Critical mutations should write audit in the same transaction where feasible.
- Best-effort audit only acceptable for non-critical observability side effects.
- Audit payloads pass sensitive masking before persistence.
- Audit reads and exports require explicit permission and tenant/company scope.
- Audit write failures increment metric and create operational alert.

## Retention

- Audit logs are not hard-deleted by routine cleanup.
- Tenant-level retention may archive to cold storage, but deletion requires legal approval.
- Export audit is retained at least as long as exported file availability plus compliance window.
- Immutable audit storage is a future scale item, not a reason to skip current audit.

## P0 Blockerlar

- Critical mutation audit yok.
- Audit sensitive data, secret, token or signed URL sakliyor.
- Audit export yetkisiz erisilebilir.
- Audit query tenant scope disina cikiyor.
