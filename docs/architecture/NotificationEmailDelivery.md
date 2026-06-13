# Notification Email Delivery

<!-- source-of-truth-standard: contract overrides markdown -->

## Ilke

E-posta teslimi kullanici requestini bloke etmez. Domain operasyonu basarili olduktan sonra notification ve email queue kayitlari olusur; worker teslimati ayrica dener. Email failure ana operationi geri almaz.

## Delivery Flow

1. Domain operation veya outbox event olusur.
2. Notification event mapper hedef kullaniciyi, scope'u ve permission'i dogrular.
3. Notification kaydi olusturulur.
4. Preference email kanalina izin veriyorsa `email_messages` kaydi `queued` olur.
5. Email worker queued kaydi `sending` yapar.
6. SMTP provider basariliysa `sent`, hataliysa `failed` ve sanitized `last_error` yazar.
7. Retry admin endpointi failed kaydi tekrar `queued` yapar.

## SMTP Config

```text
EMAIL_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM_EMAIL=no-reply@example.com
SMTP_FROM_NAME=Eden ERP
SMTP_TLS=true
EMAIL_BATCH_SIZE=50
EMAIL_MAX_RETRIES=3
```

`EMAIL_ENABLED=false` ise email message `skipped` olabilir; in-app notification devam eder.

## Security

- Email body varsayilan loglanmaz.
- TCKN, VKN, IBAN, signed URL veya raw storage path email icerigine yazilmaz.
- Email linkleri auth gerektiren uygulama URL'leridir.
- Template render kullanici inputunu escape eder.
- Provider error detaylari kullaniciya ham stack trace olarak gosterilmez.
- Admin email queue icin `email.admin` gerekir.

## Observability

Izlenecek metrikler:

- `notifications_created_count`
- `unread_count`
- `emails_queued_count`
- `emails_sent_count`
- `emails_failed_count`
- `reminders_processed_count`
- `reminder_failed_count`

Loglarda request id, tenant id, message id, template key ve status bulunabilir. Email body ve hassas degerler bulunmaz.

## Worker Davranisi

Email worker batch calisir, retry limitini asan kayitlari `failed` olarak birakir. Reminder worker due reminders kayitlarini notificationa cevirir ve kanal tercihine gore email queue olusturur. Iki worker da idempotent update kosullariyla ayni kaydi tekrar islememeye calisir.
