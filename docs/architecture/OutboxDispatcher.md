# Outbox Dispatcher

Outbox Dispatcher, `outbox_events` tablosundaki pending eventleri guvenli sekilde isler. Event uretimi `OutboxEventService`, event isleme `OutboxDispatcher`, yan etkiler ise handler katmani tarafindan yapilir.

## Sorumluluk Ayrimi

- Operation Orchestrator: Gercek mutation sonrasi event dogurur.
- Process Engine: Surec/gorev/onay eventlerini dogurur.
- OutboxEventService: Eventi standart kolonlar ve event contract bilgisiyle outbox'a yazar.
- Outbox Dispatcher: Pending eventleri locklar, handlerlari calistirir, retry/failed/skipped durumlarini yonetir.
- Event Handler: Projection invalidation, notification, audit ve AI context refresh gibi yan etkileri uygular.

## Outbox Standardi

Migration: `supabase/migrations/20260526_event_contract_outbox_dispatcher.sql`

Beklenen ana kolonlar:

- `event_version`
- `process_instance_id`
- `causation_id`
- `correlation_id`
- `metadata_json`
- `status`: `pending`, `processing`, `completed`, `published`, `failed`, `skipped`
- `retry_count`
- `max_retries`
- `locked_at`
- `locked_by`
- `occurred_at`
- `processed_at`
- `updated_at`

Legacy `published` statusu check icinde kalir; yeni dispatcher basarili eventleri `completed` yapar.

## Handlerlar

Handler registry:

- `projectionInvalidation`
- `notification`
- `audit`
- `aiContext`

Handlerlar idempotent tasarlanir. `outbox_event_handler_runs` tablosu ayni handler'in ayni event icin completed olduktan sonra tekrar calismasini engellemek icin hazirlandi.

## Retry ve Lock

Dispatcher akisi:

1. Stale `processing` locklari serbest birakir.
2. Pending eventleri batch halinde alir.
3. Eventi `processing` yapip `locked_by` ile kilitler.
4. Event contract'i bulur.
5. Handlerlari priority sirasiyla calistirir.
6. Basariliysa event `completed` olur.
7. Retry edilebilir hata varsa `retry_count` artar ve event `pending` kalabilir.
8. Max retry asilinca veya non-retryable hata olunca event `failed` olur.
9. Contract yoksa event `skipped` olur.

## Cron Endpoint

Endpoint:

- `GET/POST /api/cron/outbox-dispatch`

FastAPI migration sonrasi canonical system endpoint:

- `POST /api/v1/system/outbox/dispatch`

Next cron route'u `FASTAPI_BASE_URL` varsa bu endpoint'e proxy eder; yoksa gecici TS dispatcher fallback'i kullanir.

Python worker:

```bash
cd backend
python -m app.workers.outbox_worker --once
python -m app.workers.outbox_worker
```

Guvende kalmasi icin `CRON_SECRET` zorunludur. Secret `Authorization: Bearer ...` header'i veya `?secret=` query parametresi ile verilebilir. Secret yoksa veya hataliysa endpoint `401` doner.

Response:

```json
{
  "processed": 0,
  "completed": 0,
  "failed": 0,
  "retried": 0,
  "skipped": 0,
  "durationMs": 0
}
```
