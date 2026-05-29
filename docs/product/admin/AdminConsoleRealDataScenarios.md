# Admin Console Real Data Scenarios

## Scenario 1 - Calisma alani ayari

1. Admin `/app/sistem/genel` sayfasini acar.
2. Varsayilan para birimi ve zaman dilimini degistirir.
3. Backend `workspace_settings` kaydini gunceller.
4. Audit `workspace_settings_updated` olarak yazilir.

## Scenario 2 - Modul aktivasyonu

1. Branches modulu pasiftir.
2. Admin `/app/sistem/moduller` ekraninda modulu aktif eder.
3. Readiness sonucu `setup_required` ise kurulum adimi gosterilir.
4. Degisiklik `admin_settings` ve in-memory module activation override ile uygulanir.

## Scenario 3 - Feature flag

1. `representatives.scopeAuthority` kapali gorunur.
2. Admin flag'i acar ve neden girer.
3. `feature_flag_overrides` guncellenir.
4. Runtime Visibility ve backend precheck sonraki taleplerde yeni durumu kullanir.

## Scenario 4 - SMTP test

1. Admin entegrasyonlar sayfasinda Email/SMTP kartini acar.
2. Test action calistirir.
3. Sistem configured/missing/degraded sonucunu gosterir.
4. Secret veya password UI'da gosterilmez.

## Scenario 5 - Sistem sagligi

1. Admin `/app/sistem/saglik` sayfasini acar.
2. FastAPI, DB, storage, outbox, email queue ve readiness ozetlerini gorur.
3. Failed outbox varsa `/app/sistem/outbox` ekranina gecer.
4. Yetkisi varsa retry veya dispatch once calistirir.

## Scenario 6 - Secret guvenligi

1. Admin entegrasyon veya teknik sayfayi acar.
2. Config durumu configured/missing olarak gorunur.
3. DB URL, token, service role key, SMTP password veya signed URL raw olarak gosterilmez.

## Scenario 7 - Teknik sayfa yetki

1. Normal admin olmayan kullanici `/app/sistem/teknik` sayfasina gider.
2. Backend `adminConsole.technical` veya `system.admin` guard uygular.
3. Yetkisiz kullanici teknik detaya erisemez.
