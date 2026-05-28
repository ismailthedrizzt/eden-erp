# Notification / Reminder / Email System Product Spec

## Amac

Eden ERP'de kullanici bildirimleri, hatirlatmalar, e-posta kuyrugu, deadline/expiry/overdue uyarilari ve sistem mesajlari urun seviyesinde yonetilir. Teknik outbox eventleri kullaniciya ham sekilde gosterilmez; is dilindeki notification, reminder veya Action Center itemina donusturulur.

## Kapsam

Notification domain su kavramlari sahiplenir:

- Notification, read/unread, dismiss, archive, severity, priority ve action link.
- Reminder, remind_at, due_at, recurrence rule MVP hazirligi ve kanal secimi.
- User notification preferences, kategori bazli kanal tercihleri ve digest ayari.
- Email message queue, delivery status, retry, template render ve worker isleri.
- Outbox event mapping, Action Center ayrimi, audit ve observability metrikleri.

Domain process task lifecycle, operation mutation, audit log sahipligi, email marketing/campaign automation veya chat platform entegrasyonunu sahiplenmez.

## Notification ve Action Center Ayrimi

- Notification bilgi ve kisisel uyaridir.
- Action Center aksiyon gerektiren is merkezidir.
- `action_required=true` olan notification Action Center'da da gorunebilir.
- Notification okundu yapmak ilgili task veya approval kaydini tamamlamaz.
- Task tamamlaninca ilgili notification otomatik read/dismiss edilebilir.

## Notification Model

`notifications` tablosu tenant, user, company/branch scope, module, type, title/message, severity, priority, status, action metadata, related entity, process/task/approval/operation baglantilari, outbox event referansi, due/expires tarihleri ve delivery metadata tutar.

Desteklenen ilk notification type gruplari:

- Task: `task_assigned`, `task_due_soon`, `task_overdue`
- Approval/process: `approval_requested`, `approval_decided`, `process_completed`, `process_failed`
- Operation/system: `operation_failed`, `module_setup_required`, `system_warning`, `security_warning`
- Document: `document_missing`, `document_expiring`, `document_rejected`
- Service/HR/import-export: `service_request_assigned`, `service_request_overdue`, `sgk_pending`, `maintenance_due`, `import_completed`, `import_failed`, `export_ready`

## Reminder Model

`reminders` tablosu system-generated ve user-created basit reminder kayitlarini tasir. MVP worker:

- `scheduled` ve `remind_at <= now()` kayitlari alir.
- In-app notification olusturur.
- Email kanali aciksa email queue olusturur.
- Kaydi `sent` yapar; hata durumunda `failed` ve sanitized error metadata yazar.

Kaynaklar task due date, approval pending, employee document expiry, authority expiry, service maintenance due, SGK pending ve import/export job completion olaylaridir.

## User Preferences

`notification_preferences` kullanici bazinda kanal ve kategori tercihlerini tutar:

- `in_app_enabled`
- `email_enabled`
- `task_notifications`
- `approval_notifications`
- `system_warnings`
- `document_expiry`
- `service_reminders`
- `hr_reminders`
- `security_notifications`
- `digest_frequency`
- `language`
- `timezone`

Critical security/system notifications tamamen kapatilamaz; backend preference kontrolunden sonra kritik mesajlari yine iletebilir.

## Email Model

`email_messages` kuyruk tablosudur. API request icinde uzun e-posta gonderimi yapilmaz. Worker:

1. `queued` kayitlari batch olarak alir.
2. SMTP config ile gonderir.
3. `sent`, `failed` veya `skipped` statulerini yazar.
4. Retry count ve sanitized last_error tutar.
5. Email body loglamaz.

Env konfigurasyonu:

- `EMAIL_ENABLED`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`
- `SMTP_TLS`
- `EMAIL_BATCH_SIZE`
- `EMAIL_MAX_RETRIES`

## Templates

Baslangic template keyleri:

- `task_assigned`
- `approval_requested`
- `document_expiring`
- `service_request_assigned`
- `import_completed`
- `export_ready`
- `daily_digest`
- `weekly_digest`

Template render kullanici inputunu HTML/text icin escape eder. Email icinde signed URL veya hassas kimlik/IBAN verisi yer almaz.

## Event Mapping

Outbox handler teknik eventleri notificationa cevirir:

- `process.task_created` -> assignee icin "Yeni gorev atandi"
- `process.approval_requested` -> approver icin "Onay bekleyen islem var"
- `operation.failed` -> owner/admin icin "Islem tamamlanamadi"
- `document.expiring` -> ilgili HR/admin icin "Belgenin suresi yaklasiyor"
- `service_request.assigned` -> teknisyen icin "Yeni servis talebi atandi"
- `import.completed` -> import owner icin "Ice aktarma tamamlandi"
- `export.ready` -> export owner icin "Disa aktarma dosyaniz hazir"
- `module.setup_required` -> admin/settings kullanicisi icin "Modul kurulumu eksik"
- `security.permission_denied_repeated` -> admin/security kullanicisi icin "Yetkisiz islem denemeleri artti"

## Permissions

- `notifications.view`: kendi bildirimlerini gorur.
- `notifications.manage`: kendi preferences ve reminders kayitlarini yonetir.
- `reminders.manage`: hatirlatma listesi ve create/cancel/dismiss islemleri.
- `notifications.admin`: sistem notification yetkisi.
- `email.admin`: sistem email queue ve test/retry islemleri.

Kullanici scope disindaki kayitla ilgili notification almamalidir. Notification service duplicate spam icin ayni user/type/entity ve unread kaydi merge/update edebilir.

## UI

- Header `NotificationBell` unread count ve critical/high indicator gosterir.
- `NotificationPanel` unread, all, task/approval, document ve system sekmelerine ayrilir.
- `/app/ayarlar/bildirimler` notification listesi, read/dismiss/archive, preference formu ve reminder listesi sunar.
- `/app/sistem/e-postalar` admin email queue, status filter, failed retry ve test email queue akisini sunar.

## API Endpoints

Notifications:

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/counts`
- `GET /api/v1/notifications/{notification_id}`
- `POST /api/v1/notifications/{notification_id}/read`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/notifications/{notification_id}/dismiss`
- `POST /api/v1/notifications/{notification_id}/archive`

Preferences:

- `GET /api/v1/notifications/preferences`
- `PATCH /api/v1/notifications/preferences`

Reminders:

- `GET /api/v1/reminders`
- `POST /api/v1/reminders`
- `POST /api/v1/reminders/{reminder_id}/dismiss`
- `POST /api/v1/reminders/{reminder_id}/cancel`

Email admin:

- `GET /api/v1/system/email/messages`
- `POST /api/v1/system/email/messages/{message_id}/retry`
- `POST /api/v1/system/email/test`

## Acceptance Criteria

- Notification, reminder, preference ve email queue modelleri migration ile tanimli.
- FastAPI domain, API ve worker scaffold calisir.
- Outbox handler eventleri is dilindeki notificationa cevirir.
- Header bell, notification panel, preferences ve admin email UI vardir.
- Permission, tenant/scope, privacy ve sensitive data kurallari uygulanir.
- Action Center ayrimi korunur.
- Product spec, real data scenarios ve E2E checklist vardir.
