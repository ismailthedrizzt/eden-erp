# Webhook Security

<!-- source-of-truth-standard: contract overrides markdown -->

## Signing
Outbound webhook delivery uses HMAC SHA256. The signed string is:

```text
{timestamp}.{canonical_json_body}
```

The signature is sent in `X-Eden-Signature` and versioned with `X-Eden-Signature-Version`. The receiver should verify timestamp freshness before trusting the payload.

## Secret Handling
Webhook secrets are never stored as plaintext. Creation and rotation return the secret once. Later reads expose only `secret_preview`. Signing and verification use server-side credential material and must never expose raw values to frontend logs, audit logs or delivery response excerpts.

## Inbound Verification
Inbound endpoints require:
- Active integration app.
- Tenant context.
- Allowed inbound event type.
- Valid HMAC signature.
- Timestamp inside replay window.
- Optional IP allowlist.
- Payload size and schema validation.
- Source event idempotency.

## Target URL Protection
Production target URLs must be HTTPS. Local HTTP is allowed only for explicit dev configuration. Private network targets must be blocked unless dev-only SSRF protection is intentionally relaxed.

## Logging Rules
Logs may include app id, delivery id, event type, status, response status and sanitized error message. Logs must not include plaintext secrets, bearer tokens, basic auth, signed URLs or full sensitive payloads.

## Failure Handling
Failed deliveries are retried according to subscription retry policy. Dead-letter deliveries are visible to admins and can create Action Center warnings. Main domain transactions must not fail because a webhook delivery failed.
