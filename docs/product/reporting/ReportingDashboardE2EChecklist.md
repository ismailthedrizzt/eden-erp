# Reporting Dashboard E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Playwright Spec

Onerilen dosya: `tests/e2e/reporting-dashboard.spec.ts`

## Basliklar

- dashboard loads
- filters work
- company KPI visible
- module unavailable hidden/disabled
- financial KPI permission guarded
- ownership warning navigates to report
- overdue tasks card navigates
- report table loads
- report filters work
- export permission guarded

## Seed Data

- active companies
- draft company
- incomplete ownership
- expiring representative authority
- branch active/closed
- cari transaction missing document
- overdue project task
- service maintenance due
- audit permission denied

## Manual Regression

1. Dashboard acilir.
2. KPI kartlari gorunur.
3. Yetkiye gore kartlar gizlenir/disabled olur.
4. Sirket filtresi calisir.
5. Tarih filtresi calisir.
6. Ownership warning gorunur.
7. Representative expiring warning gorunur.
8. Action Center summary gorunur.
9. Report list acilir.
10. Report table filtrelenir.
11. Export permission kontrolu calisir.
12. Teknik hata kullaniciya gosterilmez.
