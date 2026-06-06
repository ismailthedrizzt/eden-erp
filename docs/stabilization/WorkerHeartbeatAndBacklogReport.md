# Worker Heartbeat And Backlog Report

- Tarih: 2026-06-06
- Branch: main
- Baseline commit: a5d871d release_candidate_gate_decision
- Ortam: uzak sunucu, local PostgreSQL/local DB, FastAPI canonical backend, Next.js UI/BFF
- Sprint kararı: READY_WITH_LIMITATIONS_FOR_MANUAL_FIELD_TEST

| Kanıt | Sonuç |
| --- | --- |
| Worker files | outbox, email, reminder, reporting, automation, webhook worker dosyaları mevcut. |
| PM2 process count | 2 |
| PM2 processes | `eden-app:online`, `eden-fastapi:online` |
| Dedicated worker process | Görünmüyor |
| Outbox table | Var |
| Outbox backlog | `pending: 4` |
| Worker heartbeat endpoint/table | Bu smoke'ta bulunmadı |

## Karar

READY_WITH_LIMITATIONS. Minimum field test yapılabilir; ancak outbox-dependent flow test edilirken pending backlog izlenmeli. Dedicated outbox worker process veya heartbeat visibility release öncesi P1 olarak kapatılmalıdır.

## Risk

- P1: dedicated worker process PM2 altında çalışmıyor.
- P1: heartbeat/dead-letter visibility yok.
- P0 yok: backlog görünür, tablo var, core app/API online.
