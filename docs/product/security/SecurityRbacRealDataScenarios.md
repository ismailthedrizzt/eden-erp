# Security RBAC Real Data Scenarios

<!-- source-of-truth-standard: contract overrides markdown -->

## Scenario 1 - Muhasebe kullanicisi

1. Muhasebe Kullanicisi rolunu sec.
2. `accounting.view`, `accounting.edit`, `companies.view` ve `reporting.viewFinancial` izinlerini dogrula.
3. Kullaniciya rol ata.
4. Sirket scope ver.
5. Kullanici Cari Kartlar ve Cari Hareketler ekranlarini gorur; Audit ve Security admin ekranlarini gormez.

## Scenario 2 - Sube operasyon kullanicisi

1. Operasyon Kullanicisi rolunu ata.
2. Sadece Ankara Sube icin branch scope ver.
3. `branches.view`, `branches.edit`, `tasks.transition` izinleri aktif olur.
4. Kullanici sadece kapsamindaki sube ve ilgili gorevleri gorur.

## Scenario 3 - Denetci

1. Denetci rolunu ata.
2. `audit.view` ve read-only modul view permissionlari aktif olur.
3. Mutation permission yoktur.
4. Denetci audit ve raporlari gorur ama operation baslatamaz.

## Scenario 4 - Yetkisiz sermaye artirimi

1. Kullaniciya `companies.view` verilir ama `companies.capitalIncreaseStart` verilmez.
2. Sermaye Artirimi butonu disabled olur.
3. API denemesinde `PERMISSION_DENIED` doner.
4. Permission denied auditlenir.

## Scenario 5 - Scope disi sirket

1. Kullanici sadece Sirket A scope'una sahiptir.
2. Sirket B detayina veya mutation endpointine erismeye calisir.
3. Policy `SCOPE_DENIED` sonucu verir.
4. UI kullaniciya "Kayit erisim kapsami disinda." mesajini gosterir.

## Scenario 6 - Kritik permission uyarisi

1. Ozel role `security.rolesManage` veya `settings.modulesManage` eklenir.
2. UI critical/high risk badge gosterir.
3. Kaydetmeden once degisiklik ozeti ve kritik yetki uyarisi gorunur.
4. Degisiklik auditlenir.

## Scenario 7 - Policy test

1. Admin kullanici, action ve kayit kapsami secer.
2. Sistem allowed/denied sonucunu uretir.
3. Permission, scope, module ve policy sonucu ayri gorunur.
4. Teknik traceback veya SQL hatasi kullaniciya gosterilmez.
