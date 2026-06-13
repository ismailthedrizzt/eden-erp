# Integration Hub E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

Playwright config mevcut degilse bu dosya manuel/regression checklist olarak kullanilir.

## Seed Data
- Admin user.
- Integration app.
- Active webhook secret.
- Webhook subscription.
- Sample outbox event.
- Failed delivery.
- Inbound event payload.

## Checks
- Integration app create.
- Credential create and one-time secret display.
- Credential list never shows plaintext secret.
- Credential rotate.
- Credential revoke.
- Webhook subscription create.
- Registry disi event blocked.
- Test webhook creates delivery.
- Delivery list/detail visible.
- Failed delivery retry.
- Max retry dead-letter.
- Valid inbound event accepted.
- Invalid inbound signature rejected.
- Duplicate inbound source event idempotent.
- Event types registry visible.
- Permission denied for non-admin user.
- No secret appears in UI logs or response excerpts.
