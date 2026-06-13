# P0 / P1 / P2 Field Test Risk Register

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


## P0 - Field Test Or Release Blocker
- Login ?al??m?yor.
- Sistem a??lm?yor.
- DB ba?lant?s? yanl?? veya yanl?? DB?ye ba?lan?yor.
- Release ortam?nda development sayfas? g?r?n?yor.
- Yetkisiz kullan?c?, ba?ka tenant veya ba?ka company verisi g?r?yor.
- Resmi alan normal formdan de?i?tiriliyor.
- ?ube serbest create ediliyor.
- Ortak pay? karttan de?i?tiriliyor.
- Temsil yetkisi karttan de?i?tiriliyor.
- Sermaye i?leminde y?zde y?z da??l?m bozuluyor.
- Belge media route auth?suz dosya veriyor.
- Kullan?c?ya stack trace, SQL, storage path veya secret g?r?n?yor.
- Release DB seed/reset riski var.
- Kritik wizard veri yar?m b?rak?yor.

## P1 - Field Test Can Continue, Fix Before Release
- Sayfa a??l?yor ama veri gelmiyor.
- Wizard ad?mlar? eksik.
- Belge slotlar? anla??lm?yor.
- Duplicate belge reuse ?al??m?yor.
- Action Center eksik veya yanl?? y?nlendiriyor.
- Audit kritik i?lemi eksik kaydediyor.
- Import/export validation eksik.
- Search yanl?? route/action ?neriyor.
- UI ?ablon tutars?zl??? kullan?c?y? kar??t?r?yor.
- Kullan?c? dostu hata mesaj? eksik.
- Role/permission mesajlar? anla??lmaz.
- Performance bariz yava?.

## P2 - Can Be Fixed After Release
- K???k tasar?m tutars?zl???.
- Yaz?m hatas?.
- Badge/renk/polish.
- Mobil g?r?n?m k???k bozukluk.
- Bo? state iyile?tirmesi.
- Dok?man eksi?i.
- Advanced feature eksikli?i.

## Register
| Risk ID | Date | Module | Expected behavior | Actual behavior | Result | Priority | Recommended fix | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-0001 | 2026-06-06 | TBD | TBD | TBD | test edilemedi | TBD | TBD | a??k |
