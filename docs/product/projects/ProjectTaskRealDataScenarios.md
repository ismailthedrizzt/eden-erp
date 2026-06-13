# Project / Task Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Proje olusturma

1. Aktif sirket secilir.
2. Proje olusturulur.
3. Proje `active` olur.
4. Proje icinde gorev eklenebilir.

## Scenario 2 - Gorev olusturma

1. Proje secilir.
2. Gorev basligi, oncelik ve atanan kisi girilir.
3. Gorev `todo` olur.
4. Action Center'da atanan kullaniciya `Proje Gorevi` olarak gorunur.

## Scenario 3 - Gorev durumu degistirme

1. `todo` gorev acilir.
2. Durum `in_progress` yapilir.
3. Durum `review` yapilir.
4. Durum `done` yapilir.
5. `project_task_history` kaydi olusur.

## Scenario 4 - Bloke gorev

1. Gorev `blocked` yapilir.
2. Reason girilir.
3. Action Center high warning olarak gosterir.

## Scenario 5 - Sube ile iliskili gorev

1. Branch detailden gorev olusturulur.
2. `related_entity_type=branch` ve `related_entity_id` sube ID olur.
3. Sube detailde pending/action baglaminda gorunebilir.

## Scenario 6 - Yorum ve ek

1. Task detailde yorum eklenir.
2. Dosya referansi eklenir.
3. History/audit icin `task.commented` ve `task.attachment_added` olaylari olusur.

## Scenario 7 - Geciken gorev

1. Due date gecmis acik gorev vardir.
2. Action Center urgent/high oncelik gosterir.

## Scenario 8 - Bagimsiz gorev

1. Proje secmeden gorev olusturulur.
2. Sirket ve ilgili ERP kaydi ile takip edilir.

## Process Task Ayrimi

Process task sistem isleminin parcasidir. Project task ekip is takibidir. Action Center iki kaynagi birlikte gosterir ama source_type ile ayirir.
