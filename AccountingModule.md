# Muhasebe Module

Muhasebe is the financial operation center of Eden ERP. The initial module contains two submodules:

- Cari Kartlar
- Ön Muhasebe Hareketleri

The module follows the Eden ERP page pattern: `PageBanner`, `SmartList`, reusable form surfaces, hero fields, detail tabs, view/insert/edit modes, permission-aware actions, soft delete, history readiness, and workflow-ready statuses.

Muhasebe must not create duplicate identity data. Real persons live in `persons`; legal entities live in `organizations`. Accounting records reference those master identities and store only financial settings or movements.

Current routes:

- `/app/muhasebe`
- `/app/muhasebe/cari-kartlar`
- `/app/muhasebe/on-muhasebe-hareketleri`

Public shorthand redirects exist for `/muhasebe`, `/muhasebe/cari-kartlar`, and `/muhasebe/on-muhasebe-hareketleri`.
