# CRM Stakeholder E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Playwright Spec

Onerilen dosya: `tests/e2e/crm-stakeholders.spec.ts`

## Basliklar

- master organization lookup
- customer stakeholder create
- supplier stakeholder create
- duplicate VKN warning
- create cari account from stakeholder
- lead create
- interaction add
- follow-up task create
- related records panel
- after-sales installed asset relation
- permission denied

## Seed Data

- active company
- existing master organization
- existing master person
- cari account
- stakeholder customer
- stakeholder supplier
- lead
- partner/representative linked master

## Manual Regression

1. CRM/Paydaslar menusu gorunur.
2. Paydaslar sayfasi acilir.
3. Master lookup calisir.
4. Yeni musteri olusturulur.
5. Cari kart olusturulur.
6. Duplicate VKN uyarisi calisir.
7. Lead olusturulur.
8. Etkilesim eklenir.
9. Follow-up task olusturulur.
10. Related roles panel gorunur.
11. After-sales customer relation calisir.
12. Yetkisiz kullanici erisemez.
13. Teknik hata kullaniciya gosterilmez.
