# Workflow Automation / Rule Engine Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac
Eden ERP icinde adminlerin olay, zaman ve guvenli veri kosullarina bagli bildirim, gorev, reminder, rapor ve uyari aksiyonlari tanimlayabilmesini saglar. Sistem low-code hissi verir ama keyfi kod, serbest SQL ve dogrudan kritik domain mutation calistirmaz.

## Kapsam
- Event, schedule, condition ve manual trigger.
- Registry kontrollu condition entity/field/operator listesi.
- Registry kontrollu action template listesi.
- Draft, active, paused, disabled ve failed rule lifecycle.
- Rule simulation; gercek aksiyon uretmeden match ve action preview.
- Run log ve action result kaydi.
- Notification, reminder ve project task aksiyonlari best-effort.
- Outbox/event handler ve scheduled worker hazirligi.
- Permission, tenant scope, cooldown ve max run guardlari.

## Trigger Modeli
- `event`: `event_type`, `module_key`, `entity_type`, filtreler.
- `schedule`: `hourly`, `daily`, `weekly`, `monthly`.
- `condition`: whitelist kaynaklarda periyodik kosul degerlendirme.
- `manual`: yetkili kullanicinin run-now veya simulation tetigi.

## Condition Modeli
Desteklenen operatorler: `field_equals`, `field_not_equals`, `field_in`, `field_not_in`, `field_is_empty`, `field_is_not_empty`, `date_before`, `date_after`, `date_within_days`, `number_greater_than`, `number_less_than`, `count_greater_than`, `status_is`, `module_ready`, `permission_available`, `record_scope_valid`.

Kaynaklar registry ile sinirli tutulur: document, project task, CRM opportunity, bank transaction, maintenance due, representative authority, HR employee ve data quality finding.

## Action Templates
Baslangic aksiyonlari: notification, email notification, digest item, Action Center warning, project/process task, reminder, CRM follow-up, document warnings, maintenance due service suggestion, reporting run/export, data quality finding ve admin warning.

Riskli islemler dogrudan yapilmaz; resmi sirket degisikligi, sermaye/pay, temsil yetkisi, muhasebe confirmed transaction ve permission update sadece gorev/oneri/onay uretir.

## Rule Lifecycle
Taslak kurallar calismaz. Active kurallar worker veya event handler tarafindan calisir. Paused gecici durdurmadir. Disabled kalici kapatmadir. Failure count belirli esigi asarsa kural failed statuse alinabilir.

## Worker
`backend/app/workers/automation_worker.py` due scheduled/condition kurallari alir, cooldown ve gunluk limit uygular, condition evaluate eder, action template calistirir ve run log yazar.

## Security
- Keyfi Python/JS yok.
- Serbest SQL yok.
- Condition fieldlari registry disina cikamaz.
- Action template disina cikamaz.
- Tenant boundary zorunlu.
- Company scope condition querylerine uygulanir.
- Simulation sensitive payload maskeli doner.

## API
- `GET/POST /api/v1/automation/rules`
- `GET/PATCH/DELETE /api/v1/automation/rules/{rule_id}`
- `POST /api/v1/automation/rules/{rule_id}/activate|pause|disable|run-now|simulate`
- `GET /api/v1/automation/triggers|conditions|actions|templates`
- `GET /api/v1/automation/runs`
- `GET /api/v1/automation/runs/{run_id}`

## Acceptance Criteria
Automation rule modeli, registry tabanli condition/action guardlari, simulation, worker, best-effort notification/task entegrasyonu, audit/run log ve Next proxy/UI birlikte calisir.
