# Admin Console E2E / Regression Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## E2E Basliklari

- Admin dashboard opens
- Workspace settings update
- Module activation toggle
- Feature flag toggle
- Health dashboard loads
- Integration test action
- Outbox failed event retry
- Normal user denied on admin-only actions
- Secrets not visible in UI
- Audit created for admin changes

## Seed Data

- Admin user with `adminConsole.manage`
- Normal user without admin permissions
- Disabled module
- Disabled feature flag
- Failed outbox event
- Integration status cache rows
- Workspace settings row

## Manuel Kontrol

1. `/app/sistem` acilir.
2. Genel ayarlar kaydedilir.
3. Modul listesi readiness badge'leriyle gorunur.
4. Feature flag toggle calisir ve risk uyarisi gorunur.
5. Health dashboard teknik hata metni sizdirmez.
6. Outbox retry yetkisiz kullanicida engellenir.
7. Entegrasyon kartlari secret gostermeden status verir.
8. Teknik sayfa sadece `system.admin` kapsaminda acilir.
