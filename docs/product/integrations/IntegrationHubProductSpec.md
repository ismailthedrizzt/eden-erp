# Integration Hub Product Spec

## Amac
Eden ERP icinde dis sistemlerle guvenli, izlenebilir ve retry edilebilir veri alisverisi saglamak. Integration Hub; integration app, credential, outbound webhook, inbound webhook, delivery log, dead-letter ve event registry katmanlarini tek yonetim yuzeyi altinda toplar.

## Kapsam
- Integration app tanimlama ve suspend/revoke lifecycle.
- API key ve webhook secret credential uretimi, rotate/revoke ve one-time secret gosterimi.
- Registry kontrollu outbound webhook abonelikleri.
- Outbox eventlerinden webhook delivery kaydi uretme.
- HMAC SHA256 imzali webhook payload standardi.
- Delivery worker ile retry/dead-letter akisi.
- Public inbound webhook endpointleri, signature/replay/idempotency kontrolleri.
- External service request ve CRM lead gibi sinirli inbound normalize isleme.
- Admin UI uzerinden app, credential, abonelik, delivery ve inbound olay izleme.
- Action Center ve notification best-effort admin/system uyarilari.
- Audit, permission ve tenant scope guardlari.

## Integration Apps
`integration_apps` dis sistemleri temsil eder. App aktif degilse credential, inbound ve webhook subscription calismaz. `allowed_event_types` ve `allowed_inbound_events` her istekte enforce edilir. `internal` veya sistem app kullanimi ayrica admin permission ister.

## Credentials
`integration_credentials` secret plaintext saklamaz. Secret olusturma ve rotation sirasinda bir kez dondurulur; sonraki listelerde yalniz `secret_preview` gorunur. Credential revoke edilirse imza dogrulama ve subscription signing icin kullanilmaz.

## Outbound Webhooks
Subscription olustururken event type registry ve app allowed event listesi kontrol edilir. Target URL production icin HTTPS olmak zorundadir; local HTTP yalniz dev ortaminda kabul edilir. Secret degerleri custom header icinde saklanamaz.

Payload envelope:
- `event_id`
- `event_type`
- `event_version`
- `tenant_id`
- `occurred_at`
- `aggregate_type`
- `aggregate_id`
- `operation_id`
- `correlation_id`
- `data`
- `metadata`

Headers:
- `X-Eden-Event-Id`
- `X-Eden-Event-Type`
- `X-Eden-Delivery-Id`
- `X-Eden-Timestamp`
- `X-Eden-Signature`
- `X-Eden-Signature-Version`

## Delivery Worker
`backend/app/workers/webhook_worker.py` pending delivery kayitlarini alir, statusu `delivering` yapar, imzali HTTP POST gonderir ve sonucu `delivered`, `failed` veya `dead_letter` olarak kaydeder. Retry policy subscription bazlidir ve max retry sonrasi admin warning uretilebilir.

## Inbound Webhooks
`POST /api/v1/integrations/inbound/{app_key}/{event_type}` public endpointtir ama `x-tenant-id`, active app, allowed inbound event, timestamp replay window, signature ve source event idempotency kontrolu uygular. Inbound payload dogrudan tabloya yazilmaz; once normalize edilir, sonra ilgili domain servis yolu veya review statusu kullanilir.

## Event Registry
Webhook eventleri `backend/app/domains/integrations/event_subscriptions.py` icinde whitelist olarak tutulur. Sensitive eventler permission ister ve audit/security eventleri varsayilan olarak dis webhook'a acilmaz.

## Permissions
- `integrations.view`
- `integrations.manageApps`
- `integrations.manageCredentials`
- `integrations.manageWebhooks`
- `integrations.viewDeliveries`
- `integrations.retryDelivery`
- `integrations.viewInbound`
- `integrations.processInbound`
- `integrations.admin`

## Feature Flags
- `integrations.enabled`
- `integrations.outboundWebhooks`
- `integrations.inboundWebhooks`
- `integrations.credentials`
- `integrations.deliveryRetry`
- `integrations.eventSubscriptions`
- `integrations.inboundServiceRequest`
- `integrations.webhookSigning`

## API Endpoints
- `GET/POST /api/v1/integrations/apps`
- `GET/PATCH /api/v1/integrations/apps/{app_id}`
- `POST /api/v1/integrations/apps/{app_id}/suspend|revoke`
- `GET/POST /api/v1/integrations/apps/{app_id}/credentials`
- `POST /api/v1/integrations/credentials/{credential_id}/rotate|revoke`
- `GET/POST /api/v1/integrations/webhook-subscriptions`
- `GET/PATCH /api/v1/integrations/webhook-subscriptions/{id}`
- `POST /api/v1/integrations/webhook-subscriptions/{id}/pause|resume|test`
- `GET /api/v1/integrations/webhook-deliveries`
- `GET /api/v1/integrations/webhook-deliveries/{delivery_id}`
- `POST /api/v1/integrations/webhook-deliveries/{delivery_id}/retry`
- `POST /api/v1/integrations/inbound/{app_key}/{event_type}`
- `GET /api/v1/integrations/event-types`
- `GET /api/v1/integrations/event-types/{event_type}`

## Acceptance Criteria
Integration app, credential, outbound webhook subscription, delivery retry/dead-letter, inbound webhook validation, event registry, admin UI, Next proxy, Action Center warning, docs ve backend test coverage birlikte calisir.
