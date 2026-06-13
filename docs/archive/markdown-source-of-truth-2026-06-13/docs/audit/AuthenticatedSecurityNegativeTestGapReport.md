# Authenticated Security Negative Test Gap Report

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Gap

Public/unauthenticated negative smoke P0 üretmedi. Ancak authenticated tenant/scope/media negative testleri henüz yapılmadı; bu field test öncesi veya field test sırasında zorunlu P1 kanıttır.

| test | endpoint/page | gerekli test datası | beklenen sonuç | P0 trigger | manuel test adımı |
| --- | --- | --- | --- | --- | --- |
| User A opens Company B detail | /app/sirket/companies/[id], FastAPI company detail | two users with different company scopes | 403 or not visible | Company B visible/editable | login as scoped user and request out-of-scope id |
| User A opens Branch B detail | branch detail/list APIs | branch outside user branch scope | 403 or filtered out | scope dışı branch visible | direct URL/API request |
| User A opens Document B media | /api/media/open and media-access-url | document owned by other tenant/company | 401/403 | file bytes returned | copy media URL and request as User A |
| Other tenant storagePath | /api/media/open | known storage path from another tenant | 403 DOCUMENT_STORAGE_SCOPE_DENIED or invalid | file returned | request with authenticated session |
| Lifecycle without permission | company/partner/representative/branch operation endpoints | user without operation permission | 403 | operation completes | call wizard submit without permission |
| Audit/export/admin without permission | /app/sistem/audit, export/admin APIs | normal user | 403/hidden | audit/export data visible | direct route + API call |
| x-company-scope spoof | FastAPI list endpoints | request with forged headers | ignored unless trusted proxy secret valid | scope expands | curl/browser API with forged header |
| x-user-permissions spoof | admin/lifecycle endpoints | normal user request with forged permissions | ignored | admin permission accepted | API request with header |
| Command palette scope search | global search/action guide | out-of-scope record name | not returned | out-of-scope result visible | search exact name |
| Action Center scope leak | Action Center list | out-of-scope action item | not visible | out-of-scope task visible | login scoped user and inspect list |
