# Field Test Known Limitations

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


These are field test scope notes, not defect findings by themselves.

| Area | Expected behavior | Actual behavior | Result | Priority | Recommended fix |
| --- | --- | --- | --- | --- | --- |
| CRM | Development scope; not first release scope. | TBD | TBD | P2/Scope | Test only as expanded development. |
| S?zle?meler | Development scope; not first release scope. | TBD | TBD | P2/Scope | Keep releaseStatus development until field tested. |
| Portal | Development/future scope. | TBD | TBD | P2/Scope | Do not include in first release. |
| AI Copilot | Outside release scope. | TBD | TBD | P2/Scope | Future validation. |
| e-Fatura/bank live integration | Not live-integrated in field test. | TBD | TBD | P2/Scope | Document external integration readiness separately. |
| Import/export | Limited validation. | TBD | TBD | P1/P2 | Test critical import/export only. |
| Document preview | Some file types may download instead of inline preview. | TBD | TBD | P2 | Treat as limitation unless media security fails. |
| Advanced reports | May require demo/seed data. | TBD | TBD | P2 | Document data prerequisites. |
