# Workflow Automation E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

- Rule listesi acilir.
- Template secilir ve rule create formuna uygulanir.
- Trigger secimi calisir.
- Condition builder registry entity/field/operator listesini gosterir.
- Action builder yalniz allowed template gosterir.
- Rule draft olusturulur.
- Simulation calisir ve action preview gosterir.
- Rule activate edilir.
- Run now calisir.
- Run log gorunur.
- Notification action optional altyapi varsa olusur.
- Project task action optional altyapi varsa olusur.
- Cooldown icinde tekrar calisma throttled/skipped olur.
- Normal kullanici automation create/activate yetkisi olmadan engellenir.
- Teknik hata kullaniciya ham stack trace olarak gosterilmez.

## Seed Data
- Expiring document.
- Overdue CRM opportunity.
- Unmatched bank transaction.
- Maintenance due item.
- Active admin user.
- Project task ve notifications tablolari optional entegrasyon icin hazir.
