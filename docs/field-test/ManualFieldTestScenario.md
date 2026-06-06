# Manual Field Test Scenario

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


Main story: EDEN Teknoloji?nin kurulu?undan operasyonel ?irkete d?n??mesi.

## 1. ?al??ma alan? / ilk kurulum
- Tested module: ?al??ma alan? / ilk kurulum
- User role: Admin
- Starting state: Workspace exists or setup route is available
- Steps: Open setup/readiness and confirm target tenant/company context
- Expected behavior: Setup state is clear and release/development does not mix
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 2. ?lk ?irket tasla?? olu?turma
- Tested module: ?lk ?irket tasla?? olu?turma
- User role: Company admin
- Starting state: Logged in, company module visible
- Steps: Click ?irketlerimiz and create company draft
- Expected behavior: Draft company record is created
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 3. ?irket a??l???
- Tested module: ?irket a??l???
- User role: Company admin
- Starting state: Company draft exists
- Steps: Run opening wizard through precheck, documents, summary and approval
- Expected behavior: Official opening creates lifecycle event
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 4. Ortak kartlar? olu?turma
- Tested module: Ortak kartlar? olu?turma
- User role: Company admin
- Starting state: Company exists
- Steps: Create partner card
- Expected behavior: Partner card is draft/active without share mutation
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 5. ?lk ortakl?k giri?i
- Tested module: ?lk ortakl?k giri?i
- User role: Company admin
- Starting state: Company and partner exist
- Steps: Run initial partnership operation
- Expected behavior: Ownership state updates via operation
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 6. Temsilci kart? olu?turma
- Tested module: Temsilci kart? olu?turma
- User role: Company admin
- Starting state: Company and person/org master exist
- Steps: Create representative card
- Expected behavior: Representative card is separate from authority
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 7. Temsilcilik ba?latma
- Tested module: Temsilcilik ba?latma
- User role: Company admin
- Starting state: Representative card exists
- Steps: Run authority activation wizard
- Expected behavior: Authority state becomes active after approval
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 8. ?ube a??l???
- Tested module: ?ube a??l???
- User role: Company admin
- Starting state: Company active
- Steps: Run branch opening lifecycle
- Expected behavior: Branch is created/opened via operation
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 9. ?ube bazl? temsil yetkisi
- Tested module: ?ube bazl? temsil yetkisi
- User role: Company admin
- Starting state: Branch and representative exist
- Steps: Assign branch-scoped authority
- Expected behavior: Scope is enforced
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 10. Personel i?e giri?i
- Tested module: Personel i?e giri?i
- User role: HR user
- Starting state: Employee draft exists
- Steps: Run employment entry wizard
- Expected behavior: Work relation starts via lifecycle
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 11. SGK giri?i yap?ld?
- Tested module: SGK giri?i yap?ld?
- User role: HR user
- Starting state: Employee entry process exists
- Steps: Mark SGK entry completed
- Expected behavior: SGK state/audit updates
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 12. Cari kart olu?turma
- Tested module: Cari kart olu?turma
- User role: Accounting user
- Starting state: Accounting module visible
- Steps: Create cari card
- Expected behavior: Cari card created in local DB
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 13. Cari hareket olu?turma
- Tested module: Cari hareket olu?turma
- User role: Accounting user
- Starting state: Cari card exists
- Steps: Create transaction
- Expected behavior: Transaction saved and listed
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 14. CRM m??teri/tedarik?i tan?mlama
- Tested module: CRM m??teri/tedarik?i tan?mlama
- User role: Development tester
- Starting state: CRM visible in development
- Steps: Create stakeholder
- Expected behavior: Stakeholder loads and scope is correct
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 15. ?r?n ve kurulu ?r?n
- Tested module: ?r?n ve kurulu ?r?n
- User role: Development tester
- Starting state: Product/after-sales dev modules visible
- Steps: Create product/installed asset if enabled
- Expected behavior: Development scope behavior recorded
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 16. Servis talebi ve servis kayd?
- Tested module: Servis talebi ve servis kayd?
- User role: Development tester
- Starting state: After-sales dev scope visible
- Steps: Create service request and record
- Expected behavior: Service state is traceable
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 17. Proje/g?rev a?ma
- Tested module: Proje/g?rev a?ma
- User role: Development tester
- Starting state: Project module visible
- Steps: Create project/task
- Expected behavior: Task appears in project view
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 18. Sermaye art?r?m?
- Tested module: Sermaye art?r?m?
- User role: Company admin
- Starting state: Company active
- Steps: Run capital increase wizard
- Expected behavior: Capital operation preserves integrity
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 19. Sermaye ?deme/mutabakat
- Tested module: Sermaye ?deme/mutabakat
- User role: Accounting user
- Starting state: Capital operation exists
- Steps: Record payment/reconciliation
- Expected behavior: Payment state appears correctly
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 20. Pay devri
- Tested module: Pay devri
- User role: Company admin
- Starting state: Ownership exists
- Steps: Run share transfer operation
- Expected behavior: Ownership changes via operation
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 21. Temsilci limit de?i?ikli?i
- Tested module: Temsilci limit de?i?ikli?i
- User role: Company admin
- Starting state: Active representative authority exists
- Steps: Run limit change wizard
- Expected behavior: Limit changes via lifecycle
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 22. Temsilci ask?ya alma
- Tested module: Temsilci ask?ya alma
- User role: Company admin
- Starting state: Active authority exists
- Steps: Run suspend operation
- Expected behavior: Authority is suspended
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 23. ?ube kapan???
- Tested module: ?ube kapan???
- User role: Company admin
- Starting state: Open branch exists
- Steps: Run branch closing wizard
- Expected behavior: Branch closes via operation
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 24. Personel i?ten ??k???
- Tested module: Personel i?ten ??k???
- User role: HR user
- Starting state: Active employee exists
- Steps: Run termination wizard
- Expected behavior: Work relation ends via lifecycle
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 25. Sermaye azalt?m?
- Tested module: Sermaye azalt?m?
- User role: Company admin
- Starting state: Company active
- Steps: Run capital decrease if available
- Expected behavior: Capital decrease is operation controlled
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 26. Adres / unvan / NACE / faaliyet de?i?ikli?i
- Tested module: Adres / unvan / NACE / faaliyet de?i?ikli?i
- User role: Company admin
- Starting state: Company active
- Steps: Run official change wizards
- Expected behavior: Official changes do not patch card directly
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 27. Belge y?kleme ve duplicate file reuse
- Tested module: Belge y?kleme ve duplicate file reuse
- User role: Any scoped user
- Starting state: Record detail open
- Steps: Upload same file twice in context
- Expected behavior: Second upload reuses file and relation is idempotent
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 28. S?zle?me tasla?? / belgesi / aktivasyon
- Tested module: S?zle?me tasla?? / belgesi / aktivasyon
- User role: Development tester
- Starting state: Contracts dev module visible
- Steps: Create draft, upload signed document, activate
- Expected behavior: Contract remains development scoped and lifecycle controlled
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 29. Action Center
- Tested module: Action Center
- User role: Business user
- Starting state: Pending actions exist
- Steps: Open Action Center
- Expected behavior: Items use business language and link correctly
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 30. Audit
- Tested module: Audit
- User role: Admin/auditor
- Starting state: Critical operations executed
- Steps: Open audit/by-record
- Expected behavior: Critical operation events appear
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 31. Global Search / Action Guide
- Tested module: Global Search / Action Guide
- User role: Business user
- Starting state: Records/actions exist
- Steps: Search record/action
- Expected behavior: Correct route/action appears
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 32. Dashboard / Raporlama
- Tested module: Dashboard / Raporlama
- User role: Business user
- Starting state: Data exists
- Steps: Open dashboard/reporting
- Expected behavior: Summary matches visible scope
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
## 33. Release Guard
- Tested module: Release Guard
- User role: Admin
- Starting state: Release env
- Steps: Try release and development routes
- Expected behavior: Development surfaces are blocked/hidden
- Actual behavior: TBD
- Result: TBD
- Priority: TBD
- Recommended fix: TBD
- Architecture principle check: draft vs lifecycle, document context, audit, scope, user-safe errors and FastAPI ownership must be reviewed.
