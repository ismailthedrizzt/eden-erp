# UI Template Consistency Debt Report

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Static Audit Scope

Bu rapor görsel browser field test değildir; route/component boundary ve önceki kullanıcı bulguları üzerinden statik UI/template borcunu sınıflandırır.

| page | current UI pattern | desired UI pattern | mismatch | severity | cleanup action |
| --- | --- | --- | --- | --- | --- |
| /app/sirket/companies | SmartList + company workflows; backend-core helper warnings | canonical list/detail/form + FastAPI proxy data contracts | boundary debt and field-test template proof missing | P1 | shared contract extraction; manual UX pass |
| /app/sirket/companies/partners | SmartList partner page | status then avatar columns; standard official-data labels | previous fixes need field-test proof; helper warnings | P1 | field test + component consistency audit |
| /app/sirket/companies/representatives | representative list/detail/wizard | same form/wizard template as company/partner | wizard/template differences reported previously; helper warnings | P1 | standard wizard template cleanup prompt |
| /app/belgeler | Document components and central page | central audit page + contextual upload | document components import backend-core helpers | P1 | move contracts to frontend shared types |
| /app/ik/calisanlar | HR employee page | canonical card/lifecycle separation | field test proof absent; helper warning | P1 | field test core employee flow |
| /app/muhasebe/cari-kartlar | accounting page aliases exist | canonical /app route only visible in release | /muhasebe alias family still builds | P1 | alias visibility/redirect cleanup |
| Action Center | multiple components with backend-core helper warnings | business-task center, no technical event leakage | field-test proof absent | P1 | Action Center manual scenario and helper extraction |
| Audit | admin/audit page with helper warnings | authorized audit timeline/export only | permission negative test gap | P1 | authenticated permission negative tests |

## Karar

Core field test başlamadan önce en az şirket/ortak/temsilci/belge/action-center sayfaları için template consistency smoke yapılmalıdır. Büyük UI refactor bu audit fazında yapılmadı.
