# Field Test Module Scope

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


## A. First Field Test Core Scope
Initial release decision is based on this group.

| Module | Expected behavior | Actual behavior | Result | Priority | Recommended fix |
| --- | --- | --- | --- | --- | --- |
| Login | App session login works without Supabase dependency. | TBD | TBD | TBD | TBD |
| Dashboard / Ana Sayfa | User sees permitted work surface only. | TBD | TBD | TBD | TBD |
| ?irketlerimiz | Draft/create/detail/lifecycle works. | TBD | TBD | TBD | TBD |
| Ortaklar?m?z | Card and partnership operations are separated. | TBD | TBD | TBD | TBD |
| Temsilcilerimiz | Card and authority operations are separated. | TBD | TBD | TBD | TBD |
| ?ubelerimiz | Branch lifecycle is operation controlled. | TBD | TBD | TBD | TBD |
| Te?kilat/Kadro | Organization data loads and respects scope. | TBD | TBD | TBD | TBD |
| Tesisler/Lokasyonlar | Facility cards and branch links work. | TBD | TBD | TBD | TBD |
| ?al??anlar | Employee card and work lifecycle load. | TBD | TBD | TBD | TBD |
| Cari Kartlar | Accounting cards create/load safely. | TBD | TBD | TBD | TBD |
| Cari Hareketler | Transactions create/load without data leak. | TBD | TBD | TBD | TBD |
| Belgeler | Context upload, preview/download and duplicate reuse work. | TBD | TBD | TBD | TBD |
| Action Center | Business-language pending actions appear. | TBD | TBD | TBD | TBD |
| Audit | Critical operations are traceable. | TBD | TBD | TBD | TBD |
| Release Guard | Release surface hides development routes. | TBD | TBD | TBD | TBD |

## B. Expanded Development Test Scope
These can be tested in development but are not automatically included in first release.

CRM / Payda?lar, Proje / G?rev Y?netimi, Sat?? Sonras?, ?r?n / Hizmetler, Import / Export, Data Quality, Raporlama, Bildirimler, S?zle?meler.

## C. Outside First Release Scope
AI Copilot, Customer Portal, Integration Hub, Automation Rule Engine, Advanced Reporting, full payroll, full e-Fatura/bank API integration, e-signature and contract negotiation portal.

## Rule
A determines the first release decision. B can produce development findings. C is future/development only.
