# Accounting Reconciliation E2E Checklist

## Seed

- Active company
- Bank account
- Cari account
- Cari transaction with `document_needed`
- Unmatched bank transaction
- Unmatched e-document
- Capital reconciliation row
- User with accounting reconciliation permissions
- User without accounting permissions

## E2E Basliklari

- Bank account create
- Bank account list shows masked IBAN
- Bank transaction import dry-run
- Bank transaction import confirm
- e-document import
- e-document reject
- Matching suggestions list
- Manual match
- Partial match
- Unmatch
- Ignore bank transaction
- Capital reconciliation match payment
- Action Center accounting warning
- Reporting accounting KPI
- Unauthorized user denied

## Manuel Smoke

1. `/app/muhasebe/banka-hesaplari` acilir.
2. Banka hesabi listesinde IBAN maskeli gorunur.
3. `/app/muhasebe/banka-hareketleri` acilir.
4. Unmatched banka hareketleri gorunur.
5. `/app/muhasebe/e-fatura-e-arsiv` acilir.
6. E-belge reddedilebilir.
7. `/app/muhasebe/mutabakat` onerileri gosterir.
8. Oneri onaylaninca status guncellenir.
9. `/app/muhasebe/sermaye-mutabakati` expected/paid/outstanding gosterir.
10. Yetkisiz kullanici finansal kayitlara erisemez.

