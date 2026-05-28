# Security RBAC E2E Checklist

Playwright varsa hedef dosya:

- `tests/e2e/security-rbac.spec.ts`

## E2E Basliklari

- roles list
- role create
- permission matrix edit
- user role assign
- user role remove
- company scope assign
- branch scope assign
- effective permissions view
- policy test allowed
- policy test denied
- permission denied UI
- API permission denied
- scope denied
- audit permission change
- normal user cannot access security admin

## Seed Data

- admin user
- accounting user
- branch user
- auditor user
- two companies
- two branches
- default roles
- custom role
- permission denial audit rows

## Manuel Kontrol

1. Kullanicilar sayfasi acilir.
2. Roller sayfasi acilir.
3. Yetki Matrisi sayfasi acilir.
4. Ozel rol olusturulur.
5. Role permission eklenir.
6. Kullaniciya rol atanir.
7. Kullanici rol kaldirilir.
8. Company scope atanir.
9. Branch scope atanir.
10. Effective permission ozeti gorunur.
11. Policy test allowed/denied sonuclari verir.
12. Yetkisiz kullanici security admin sayfasina erisemez.
13. Permission denied auditlenir.
14. Scope denied auditlenir.
15. Kritik permission uyarisi gorunur.
16. Teknik hata kullaniciya gosterilmez.
