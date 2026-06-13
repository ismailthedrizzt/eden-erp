# Event Subscription Model

<!-- source-of-truth-standard: contract overrides markdown -->

## Event Registry
Publishable integration events are whitelist based. Each event defines:
- `event_type`
- module key
- aggregate type
- description
- sensitivity flag
- required permission

Registry events are maintained in `backend/app/domains/integrations/event_subscriptions.py`.

## Envelope
All outbound webhook payloads use a stable envelope:

```json
{
  "event_id": "...",
  "event_type": "...",
  "event_version": "1.0",
  "tenant_id": "...",
  "occurred_at": "...",
  "aggregate_type": "...",
  "aggregate_id": "...",
  "operation_id": "...",
  "correlation_id": "...",
  "data": {},
  "metadata": {}
}
```

## Delivery Creation
Outbox handlers find active subscriptions matching the event type, apply app and subscription allowlists, create immutable delivery records and leave actual HTTP delivery to `webhook_worker`.

## Versioning
Additive fields can remain on the same event version. Removing fields, changing meaning or changing data shape requires a new `event_version`. Existing subscribers should continue receiving the old contract until a migration window is completed.

## Tenant Boundary
Every event and delivery carries `tenant_id`. Subscriptions, credentials and inbound events are tenant scoped. Cross-tenant event delivery is a production blocker.

## Sensitive Events
Audit/security events and high-risk financial, HR or identity events are default closed. They require explicit registry entry and admin-level permission before external delivery is allowed.
