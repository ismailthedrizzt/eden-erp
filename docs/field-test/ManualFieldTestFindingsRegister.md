# Manual Field Test Findings Register

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


## Architecture Principles To Tag On Each Finding
1. `Ekle` taslak kay?t m? olu?turuyor?
2. Kart/form ile lifecycle/operation ayr?m? korunuyor mu?
3. Resmi/hukuki/finansal alan normal formdan de?i?tirilemiyor mu?
4. Wizard precheck, belge, ?zet, onay ad?mlar? tutarl? m??
5. Belge ilgili ba?lamda y?kleniyor mu?
6. Ayn? belge tekrar y?klenirse duplicate file reuse ?al???yor mu?
7. Action Center kullan?c?ya i? diliyle y?nlendiriyor mu?
8. Audit kritik i?lemleri kaydediyor mu?
9. Yetki/scope d??? veri g?r?nm?yor mu?
10. Kullan?c?ya teknik stack trace/DB error g?r?nm?yor mu?
11. Release registry do?ru y?zeyi g?steriyor mu?
12. FastAPI canonical backend ilkesi bozuluyor mu?

## Findings Table
| ID | Date | Environment | User role | Module | Page / route | Operation | Expected behavior | Actual behavior | Result | Issue type | Architecture principle violation | Screenshot / video | Log / request id / correlation id | Recommended fix | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FT-0001 | 2026-06-06 | Remote/local DB | TBD | TBD | TBD | TBD | TBD | TBD | test edilemedi | TBD | TBD | TBD | TBD | TBD | TBD | a??k |

## Result Values
`ge?ti`, `k?smen ge?ti`, `kald?`, `test edilemedi`.

## Issue Types
`P0`, `P1`, `P2`, `UX`, `Veri`, `Yetki`, `Performans`, `Dok?mantasyon`.

## Status Values
`a??k`, `d?zeltmede`, `d?zeltildi`, `tekrar test bekliyor`, `kapand?`.
