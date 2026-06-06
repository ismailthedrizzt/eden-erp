# Dead Code And Unused Helpers Report

- Tarih: 2026-06-06
- Branch: main
- Commit hash: 3c089be p1_stabilization_backend_ops_proof
- Kapsam: app, components, lib, backend, scripts, docs, docker-compose, package.json, next.config.js, middleware.ts, README.md
- Çalışma tipi: audit only; kod silme/refactor yok

## Şüpheli Adaylar

| file/path | neden unused/şüpheli? | import/caller bulunuyor mu? | silinirse risk | önerilen aksiyon | priority |
| --- | --- | --- | --- | --- | --- |
| app/app/demo/image-slot-uploader/page.tsx | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| app/app/demo/document-slot-uploader/page.tsx | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| app/app/demo/user-avatar/page.tsx | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| components/layout/DemoModeBadge.tsx | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| lib/supabase/server.ts | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| lib/supabase/client.ts | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| lib/modules/after-sales/afterSales.mock.ts | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| lib/modules/project-management/projectManagement.mock.ts | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| lib/modules/product-services/productServices.mock.ts | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| lib/modules/employees/dashboard/employeesDashboard.mock.ts | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/scripts/validate_demo_data.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/scripts/seed_demo.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/tests/test_demo_seed.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/schemas/placeholder.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_seed.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/reporting.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/partners.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/companies.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/accounting.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/notifications.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/processes.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/hr.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/facilities.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/documents.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/common.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/data_quality.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/__init__.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/after_sales.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/branches.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/representatives.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/crm.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/audit.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/projects.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/users.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/seeds/demo_data/organization.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/app/domains/ai_assistant/providers/mock_provider.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/.venv/lib/python3.12/site-packages/_pytest/legacypath.py | name suggests old/legacy | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/.venv/lib/python3.12/site-packages/pydantic/_internal/_mock_val_ser.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/.venv/lib/python3.12/site-packages/httpx/_transports/mock.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/.venv/lib/python3.12/site-packages/httpcore/_backends/mock.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/.venv/lib/python3.12/site-packages/sqlalchemy/engine/mock.py | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| backend/.venv/lib/python3.12/site-packages/sqlalchemy/event/legacy.py | name suggests old/legacy | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| docs/pilot/PilotDemoScript.md | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| docs/pilot/DemoDataResetGuide.md | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| docs/audit/CurrentSupabaseVercelResidueInventory.md | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |
| docs/audit/SupabaseVercelResidueCleanupReport.md | path suggests legacy/demo/mock/supabase wrapper | not proven in this audit | unknown until caller audit | grep/caller audit before delete | P2/P1 if runtime |

## Karar

Bu fazda unused olduğu kesinleşmeyen hiçbir dosya silinmedi. Her aday için caller audit, build/typecheck ve ilgili route smoke gerekir.
