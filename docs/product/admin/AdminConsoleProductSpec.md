# Admin Console / System Settings Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Amac

Eden ERP Admin Console, sistem yoneticisinin calisma alani ayarlarini, modulleri, feature flagleri, kullanici/rol baglantilarini, bildirim/e-posta, storage, import/export, entegrasyon, health, outbox ve teknik durumu tek ve guvenli bir merkezden yonetmesini saglar.

Admin Console business operation ekrani degildir. Sirket acilisi, pay devri, temsil yetkisi veya muhasebe hareketi gibi domain mutation akislari ilgili wizard/domain servislerinde kalir.

## Kapsam

- Calisma alani ayarlari
- Modul ve lisans gorunumu
- Feature flag override yonetimi
- Security/RBAC sayfalarina yonlendirme
- Bildirim/e-posta, belge/storage ve import/export ayar ozetleri
- Entegrasyon durum kartlari
- Sistem sagligi ve deep health
- Outbox/worker admin islemleri
- Audit ve riskli ayar degisikligi izleri
- Teknik sayfa, sadece `system.admin`

## Veri Modeli

Yeni tablolar:

- `workspace_settings`
- `admin_settings`
- `feature_flag_overrides`
- `integration_status_cache`
- `worker_heartbeats`

Secret, token, DB URL, service role key ve SMTP password gibi degerler bu tablolarda veya UI'da raw olarak gosterilmez.

## Workspace Settings

Yonetilen alanlar:

- calisma alani adi
- ulke
- varsayilan dil
- varsayilan para birimi
- zaman dilimi
- tarih/sayi formatlari
- logo document id
- onboarding metadata

Degisiklikler `adminConsole.manage`, `settings.edit` veya `system.admin` ile sinirlanir ve auditlenir.

## Moduller ve Feature Flags

Admin Console, Module Registry ve Readiness kaynaklarini birlestirir:

- modul aktif/pasif durumu
- lisans durumu
- readiness status
- dependency ve setup step bilgisi
- modul bazli feature flag listesi

Riskli feature flaglerde UI uyarisi vardir. Backend precheck ve Runtime Visibility kapali ozellikleri enforce etmeye devam eder.

## Health / Integrations / Outbox

Health dashboard su kontrolleri ozetler:

- Next app
- FastAPI
- DB
- Supabase/Auth/Storage config durumu
- audit table
- outbox backlog
- email queue
- module readiness
- metric snapshot

Outbox admin aksiyonlari `adminConsole.outboxAdmin`, `outbox.dispatch` veya `system.admin` ister. Failed retry, dispatch once ve future stale lock release islemleri auditlenmelidir.

## Permissions

- `adminConsole.view`
- `adminConsole.manage`
- `adminConsole.technical`
- `adminConsole.outboxAdmin`

Admin Console, mevcut `settings.*`, `security.*`, `email.admin`, `documents.admin`, `import/export` ve `audit.*` yetkilerine link verir; bu domainlerin kendi guardlarini bypass etmez.

## API Endpoints

- `GET /api/v1/admin`
- `GET /api/v1/admin/workspace-settings`
- `PATCH /api/v1/admin/workspace-settings`
- `GET /api/v1/admin/modules`
- `GET /api/v1/admin/modules/{module_key}`
- `PATCH /api/v1/admin/modules/{module_key}/activation`
- `GET /api/v1/admin/features`
- `PATCH /api/v1/admin/features/{feature_key}`
- `GET /api/v1/admin/health`
- `GET /api/v1/admin/health/deep`
- `GET /api/v1/admin/integrations`
- `POST /api/v1/admin/integrations/{integration_key}/test`
- `GET /api/v1/admin/outbox`
- `POST /api/v1/admin/outbox/{event_id}/retry`
- `POST /api/v1/admin/outbox/dispatch-once`
- `GET /api/v1/admin/settings`
- `PATCH /api/v1/admin/settings/{settings_key}`

## Acceptance Criteria

- Admin Console dashboard acilir.
- Workspace settings backend state uzerinden okunur/guncellenir.
- Modul, readiness ve feature flag durumlari tek merkezde gorunur.
- Health, integration ve outbox durumlari admin tarafindan izlenir.
- Riskli degisiklikler audit/outbox hazirligina sahiptir.
- Secrets maskelenir veya hic gosterilmez.
- Next proxy route'lari FastAPI canonical endpointlerine gider ve legacy fallback icermez.

## Known Gaps

Known gaps are tracked in [AdminConsoleKnownGaps.md](./AdminConsoleKnownGaps.md) and summarized in the final release gate risk list.
