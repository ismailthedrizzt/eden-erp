# Notification / Reminder E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Seed

- Iki tenant kullanicisi ve bir admin kullanici.
- Atanmis task.
- Bekleyen approval.
- 30 gun icinde suresi dolacak document.
- Atanmis service request.
- `queued`, `sent` ve `failed` email message.
- Kullanici notification preference kaydi.

## E2E Basliklari

- Notification bell unread count gosterir.
- Notification panel acilir.
- Notification read islemi count'u azaltir.
- Dismiss notification listeden cikar.
- Archive notification all tab disinda gorunmez.
- Preferences update backendde kalici olur.
- Task assigned event notification olusturur.
- Approval requested event action_required notification olusturur.
- Document expiring reminder notification olusturur.
- Email preference aciksa email queue olusur.
- Email admin failed email kaydini retry eder.
- Yetkisiz kullanici `/app/sistem/e-postalar` veya `/api/system/email/messages` erisemez.
- Scope disi branch/entity icin notification olusmaz.
- Email body, signed URL ve hassas veri audit/log icine yazilmaz.

## Manuel Kontrol

1. `/app/ayarlar/bildirimler` acilir.
2. Header `NotificationBell` gorunur.
3. Unread count backend count endpointiyle uyumludur.
4. Notification panel unread/all/tasks/documents/system sekmeleriyle acilir.
5. Mark read, read all, dismiss ve archive calisir.
6. Preferences formu kanal/kategori tercihlerini kaydeder.
7. Reminder create/cancel/dismiss calisir.
8. Reminder worker due kaydi notificationa cevirir.
9. Email worker queued mesajlari sent/failed isler.
10. `/app/sistem/e-postalar` admin ekraninda failed email retry calisir.
11. Teknik hata kullaniciya stack trace olarak gosterilmez.
