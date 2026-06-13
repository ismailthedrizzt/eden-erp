# Permission Matrix

<!-- source-of-truth-standard: contract overrides markdown -->

Canonical permission listesi `backend/app/policies/permissions.py` ve `packages/shared/src/permissions.ts` uzerinden yonetilir. Security UI bu registry'den gelen permissionlari modul bazinda gruplar.

## Modul Gruplari

- Sirketlerimiz
- Ortaklarimiz
- Temsilcilerimiz
- Subelerimiz
- Teskilat/Kadro
- Tesisler/Lokasyonlar
- Muhasebe
- IK
- Proje/Gorev
- Satis Sonrasi
- CRM/Paydaslar
- Raporlama
- Audit
- Kurulum/Ayarlar
- Kullanicilar/Roller/Yetkiler
- Sistem

## Risk Seviyesi

| Risk | Kural |
| --- | --- |
| critical | Sistem admin, kullanici/rol yonetimi, modul yonetimi, outbox dispatch |
| high | Kritik mutation/export/reversal/termination permissionlari |
| medium | Edit, start, manage kategorisindeki permissionlar |
| low | View/comment gibi dusuk riskli permissionlar |

## Save Kurallari

- Registry disi permission kaydedilemez.
- Deprecated permissionlar varsayilan matrix'te gizlenir.
- Kritik permission secildiginde UI warning gosterir.
- Default sistem rolunun permissionlari DB role kaydi olmadan degistirilemez.
- Permission degisikligi audit/outbox event'e hazirlanir.

## Ornek Permissionlar

- `companies.view`
- `companies.edit`
- `companies.openingStart`
- `companies.officialChangeStart`
- `companies.capitalIncreaseStart`
- `branches.view`
- `branches.openingStart`
- `branches.closingStart`
- `partners.ownershipStart`
- `representatives.authorityTerminate`
- `accounting.export`
- `hr.sensitiveView`
- `tasks.transition`
- `afterSales.serviceComplete`
- `crm.createCariAccount`
- `reporting.viewFinancial`
- `audit.view`
- `settings.modulesManage`
- `security.rolesManage`
- `security.scopesManage`
