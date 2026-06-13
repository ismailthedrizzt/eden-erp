# Notification / Reminder Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Gorev Atamasi

1. Kullaniciya proje gorevi atanir.
2. `process.task_created` outbox event olusur.
3. Notification handler assignee icin `task_assigned` notification yaratir.
4. Gorev Action Center'da aksiyon itemi olarak da gorunur.
5. Kullanici bildirimi okundu yapar; gorev tamamlanmis sayilmaz.

## Scenario 2 - Onay Istegi

1. Sermaye Artirimi onaya gider.
2. `process.approval_requested` event approver icin notification uretir.
3. `action_required=true` oldugu icin Action Center'da da gorunebilir.
4. Kullanici email tercihini acik tutuyorsa email queue kaydi olusur.

## Scenario 3 - Belge Suresi Yaklasiyor

1. Calisan belgesinin `expiry_date` degeri 30 gun icindedir.
2. Document expiry reminder veya outbox event calisir.
3. Ilgili HR/admin kullanicisi icin `document_expiring` notification uretilir.
4. Kullanici belge detayina gider ve yeni belge/versiyon akisina devam eder.

## Scenario 4 - Servis Talebi Atandi

1. Teknisyene servis talebi atanir.
2. `service_request.assigned` event teknisyen icin notification ve email queue yaratir.
3. Teknisyen mobilde notification panelinden kayda gider.
4. Email linki auth gerektirir; signed URL icermez.

## Scenario 5 - Import Tamamlandi

1. Import job `completed` olur.
2. `import.completed` event import owner icin notification yaratir.
3. Kullanici notification action linkinden import sonuc raporuna gider.

## Scenario 6 - Email Failure

1. SMTP provider hata doner.
2. Email worker `email_messages.status=failed`, `retry_count+1` ve sanitized `last_error` yazar.
3. Admin `/app/sistem/e-postalar` ekraninda failed kaydi gorur.
4. Admin retry ile kaydi tekrar `queued` yapar.

## Scenario 7 - Kullanici Tercihleri

1. Kullanici document expiry email kanalini kapatir.
2. In-app notification devam eder.
3. Email queue olusmaz.
4. Critical security notification preference kapali olsa bile backend tarafindan iletilebilir.

## Scenario 8 - Yetkisiz Notification Engeli

1. Kullanici scope disindaki branch kaydini goremiyor.
2. Event mapping hedef kullanici seciminde permission/scope kontrolu uygular.
3. Kullaniciya notification veya email olusmaz.
