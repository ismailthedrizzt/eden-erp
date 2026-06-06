# Eden ERP - AI Collaboration Guide

## Current Canonical Runtime Rules

Date: 2026-06-06

- Eden ERP currently runs on a remote server with local PostgreSQL/local DB.
- Next.js is the UI/BFF/proxy layer.
- FastAPI is the canonical backend for business mutation, lifecycle operations, audit, policy and DB access.
- Local filesystem document storage is the canonical document file layer.
- App session plus FastAPI trusted proxy context is the canonical browser auth path.
- Supabase/Vercel references are legacy or compatibility only unless a task explicitly says otherwise.
- `Ekle` creates draft state; official/legal/financial completion uses lifecycle wizard/operation flows.
- Documents are uploaded in context and managed centrally.
- Release surface is not build surface; use the release registry.
- Action Center is a business work center, not a technical event dump.
- Local DB is a protected asset; run DB target guards before migration, seed or reset.
- Critical operations must be audited.

## Purpose

This document ensures consistent, coherent development across all AI-assisted sessions. It serves as the single source of truth for architectural decisions, coding conventions, and design patterns. **AI assistants must follow these guidelines and warn users when requests conflict with established architecture.**

## Project Overview

**Eden ERP** is a comprehensive enterprise resource planning system designed for Turkish companies, supporting multi-company, multi-module operations with workflow approval processes.

This is a newly designed platform, not a legacy system that must preserve obsolete behavior. Do not keep contradictory, duplicate, unused or architecture-breaking code only for "backward compatibility". Compatibility is allowed only for live migration bridges that are explicitly aligned with the target architecture.

### Core Characteristics
- **Multi-tenant**: Supports multiple companies in single instance
- **Modular**: Module-based licensing and activation
- **Workflow-driven**: Form submissions can require approval processes
- **Hierarchical organization**: Department/position/role-based structure
- **PWA-enabled**: Progressive Web App capabilities
- **Dark mode support**: Full dark/light theme implementation

## Tech Stack (Target Architecture)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 3.4 + custom Eden theme colors
- **UI Components**: Eden custom components and shadcn-style composition patterns where already present
- **Icons**: Lucide React
- **State Management**: React hooks (useState, useReducer) + Context for global state
- **Data Fetching**: API client wrappers and BFF calls; frontend must not call Supabase service-role or core business data access directly

### BFF / Adapter
- **Runtime**: Next.js API routes during migration
- **Role**: proxy/adaptor, UI-specific endpoint, and frontend compatibility bridge
- **Rule**: permanent domain mutation, process engine, policy engine, outbox dispatcher, audit core logic and transaction boundary logic must not remain here long-term
- **Hard rule**: Do not add new domain/business logic to Next.js API routes. New core backend logic must be implemented in FastAPI/Python. Next routes may only proxy, adapt frontend/session/upload concerns, or keep explicitly documented temporary fallbacks.

### Core Backend
- **Framework**: FastAPI / Python
- **Validation**: Pydantic v2
- **Data Access**: SQLAlchemy 2 or SQLModel
- **Migrations**: Alembic
- **Database**: PostgreSQL / local server DB
- **Workers**: Python background workers for outbox, process, projection, audit and notification jobs

### Database / Auth / Storage
- **Database platform**: local/server PostgreSQL
- **Auth**: App session + FastAPI trusted proxy is canonical; Supabase Auth is legacy compatibility only
- **Storage**: local filesystem document storage is canonical; Supabase Storage is legacy compatibility only
- **Realtime**: worker/outbox-driven notifications are canonical; Supabase Realtime is legacy compatibility only

Supabase and Vercel are not canonical runtime platforms for Eden ERP. Core ERP business behavior, DB access and lifecycle mutation belong in FastAPI/Python backed by local PostgreSQL.

## Platform Cleanup Phase 1 Rules

- Supabase/Vercel are not canonical deployment targets.
- FastAPI + local DB is the canonical backend/data path.
- Middleware must not require Supabase env values to start.
- New DB, migration, seed and reset commands must run through `npm run db:target:check` or the matching `db:*:check` guard.
- Release DB seed/reset is forbidden.
- Release migration requires `ALLOW_RELEASE_DB_MIGRATION=true` and `RELEASE_MIGRATION_APPROVED_BY=<name>`.
- Business mutation submit buttons must route to FastAPI-backed canonical endpoints through the form/wizard template path.

## Auth Collaboration Rules

- New auth work must not use Supabase Auth as the canonical path.
- Canonical browser auth is `eden_app_session` plus Next middleware/BFF.
- Canonical backend auth is FastAPI trusted proxy context validated with `TRUSTED_PROXY_SECRET`.
- New business endpoints must use FastAPI permission, tenant and scope context.
- Next API routes must not own DB/auth business logic; they may proxy or adapt session/upload concerns.
- Direct public FastAPI access is not part of MVP unless a task explicitly defines JWT/API-token auth, CORS and rate limiting.

### Key Dependencies (Locked Versions)
```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.4.0",
  "lucide-react": "latest"
}
```

## Backend Migration Rule

TypeScript API routes are temporary BFF / migration bridge code unless explicitly marked `keep_bff_proxy`, `keep_ui_adapter` or `keep_frontend`. Backend files that contain business logic should carry a migration status comment:

```ts
// BACKEND_MIGRATION_STATUS: migrate_to_fastapi
// TARGET_BACKEND_MODULE: branches
// TARGET_FASTAPI_ENDPOINT: /api/v1/branches
// NOTES: Contains domain mutation logic; should move to Python Branch Domain Service.
```

Allowed statuses:

```text
keep_frontend
keep_bff_proxy
keep_ui_adapter
proxy_to_fastapi
proxy_to_fastapi_with_legacy_fallback
proxy_to_fastapi_with_temporary_fallback
keep_session_bootstrap
keep_upload_adapter
keep_temporary_fallback
migrate_to_fastapi
migrate_to_fastapi_then_proxy
delete_obsolete
contract_shared
keep_shared_contract
keep_generated
generated_do_not_edit
deprecated_wrapper
```

Next.js API routes may act as:

1. BFF / proxy
2. UI-specific adapter
3. frontend-only helper endpoint

They must not remain the permanent home for domain mutation, operation orchestration, process engine, policy engine core, transaction boundary, outbox dispatch, audit core write logic or cross-domain business rules.

## Company-Related Lifecycle, Operation and Payload Architecture

### Core Rule

Company-related pages such as Companies, Partners, Representatives, Stakeholders and future similar role-based pages must separate the following concepts:

1. Main record lifecycle
2. Official/business operation lifecycle
3. Current calculated state / read model
4. Workflow / approval status
5. Technical persistence status

Never mix these into a single `status` field.

A page is not complete if only the frontend is updated. Every lifecycle-driven change must be checked across:

```text
Frontend form fields
-> normalizePayload
-> service layer
-> API route parser
-> operation request
-> mapper
-> transaction table insert
-> main table patch
-> current view / read model
-> frontend read model
-> shared type contract
-> DB migration and constraints
-> RLS / tenant scope
-> outbox event
```

---

### Main Record Lifecycle

Main records must use a narrow `record_status`.

For representative-like role cards:

```ts
type MainRecordStatus = 'draft' | 'active' | 'passive'
```

Do not put operation-result states such as the following into the main record lifecycle:

```ts
'suspended' | 'expired' | 'terminated' | 'transferred' | 'liquidated'
```

These belong to operation/current-view status fields, not to the main card lifecycle unless the conceptual entity itself truly has that lifecycle stage.

For Representatives:

```text
company_representatives.record_status:
- draft
- active
- passive
```

Representative authority state must be separate:

```ts
type RepresentativeAuthorityRecordStatus =
  | 'draft'
  | 'active'
  | 'suspended'
  | 'expired'
  | 'terminated'
```

Use separate fields:

```ts
record_status              // main representative card lifecycle
authority_status           // current authority display/status
authority_record_status    // authority lifecycle from current view
current_authority          // current authority read model
```

---

### Operation / Transaction Tables

Any real-world official event must be represented as an operation/transaction record, not as direct field edits on the main card.

Examples for Partners:

```text
Initial Partnership Entry
Share Transfer
Partial Share Transfer
Exit from Partnership
Voting / Profit Share Change
Capital Increase
Correction Entry
Reversal Entry
```

Examples for Representatives:

```text
Start Representation
Renew Authority
Change Authority Scope
Change Limit
Suspend Authority
Terminate Authority
Correction Entry
Reversal Entry
```

The main card may be created as a draft first. The official operation activates or changes the business state.

---

### Current View / Read Model

Calculated current state must be read from a current view / read model.

Examples:

```text
v_current_ownership
v_current_representative_authorities
```

Current views may expose calculated fields such as:

```ts
current_share_ratio
current_voting_ratio
current_profit_ratio
authority_status
authority_record_status
effective_date
end_date
warnings
```

Current views must not overwrite, replace or semantically blur the main table's `record_status`.

Correct API response pattern:

```ts
{
  record_status: row.record_status,
  authority_status: current?.authority_status,
  authority_record_status: current?.authority_record_status,
  current_authority: current
}
```

Incorrect pattern:

```ts
{
  record_status: current.record_status || row.record_status
}
```

---

### Normal Card Update vs Official Operation Update

Normal card updates may only update identity, contact, profile and card-level fields.

Normal card updates must not update:

```text
status
record_status
official authority fields
ownership/share/capital fields
limits
signature authority
effective dates
approval/workflow fields
current view fields
```

Use separate mappers.

Correct pattern:

```ts
mapRepresentativeCardForDb()
mapRepresentativeAuthorityTransactionForDb()

mapPartnerCardForDb()
mapOwnershipTransactionForDb()
```

Do not use one generic mapper for both card updates and official operations.

---

### Payload Pipeline Acceptance Rule

Before accepting any lifecycle/operation-driven page, verify the complete payload pipeline:

```text
1. Frontend form fields
2. Frontend normalizePayload
3. Service layer method
4. API route parser
5. Operation request creation
6. DB mapper
7. Transaction table insert
8. Main table patch
9. Current view / read model
10. Frontend read model
11. Shared type definitions
12. DB migrations and constraints
13. RLS / tenant scope
14. Outbox event
```

A change is incomplete if it only updates React components or page layout.

---

### List Page Rule

List pages are for viewing, filtering and selecting records.

Do not add:

```text
action column
rowActions
three-dot action menu
inline edit/delete/operation buttons
```

The list may have:

```text
lifecycle status icon as the first column
widgets
filters
search
sorting
pagination
row click to open the form
```

All lifecycle / operation actions must be triggered from the form through `EntityForm.operationActions`.

---

### Lifecycle Icon Rule

The first list column for lifecycle-driven records must be a fixed-width lifecycle icon column.

Standard pattern:

```ts
{
  key: 'record_status',
  label: 'Durum',
  type: 'enum',
  width: 44,
  minWidth: 44,
  maxWidth: 44,
  fixedWidth: true,
  sortable: false,
  hideHeaderLabel: true,
  category: 'Durum',
  order: -10,
  render: (_value, row) => <RecordStatusDot status={getRecordLifecycleStatus(row)} />
}
```

This icon is status-only. It must not open an action menu or trigger an operation.

---

### Form Operation Rule

Lifecycle and official operation actions must be shown inside the form via `EntityForm.operationActions`.

Example operation groups:

```text
Lifecycle
Official Updates
Card Information
```

Examples for Representatives:

```text
Lifecycle:
- Start Representation
- Suspend Authority
- Terminate Authority

Official Updates:
- Renew Authority
- Change Authority Scope
- Change Limit
- Correction Entry
- Reversal Entry

Card Information:
- Update Card Information
```

Card information updates must not mutate lifecycle, authority, ownership, limit, effective date or workflow fields.

---

### Workflow Rule

Frontend must never hard-code workflow or approval completion.

Never send from frontend:

```ts
approval_status: 'approved'
workflow_status: 'approved'
```

Frontend creates an operation request. Backend policy/workflow determines approval status.

Temporary auto-approval is allowed only as an explicit backend policy for simple/small-business mode. It must not be hidden in frontend payloads.

---

### Authority / Operation Status Rule

Do not use a single `status` field for all of the following:

```text
workflow status
approval status
transaction status
authority effect status
main record status
```

Use separate fields.

Recommended pattern:

```ts
record_status                 // main card lifecycle
workflow_status               // workflow state
approval_status               // approval state
transaction_status            // transaction processing state
authority_effect_status       // business effect of authority transaction
authority_record_status       // current authority lifecycle
```

For Representative authority transactions:

```text
Start Representation       => authority active
Renew Authority             => authority active
Change Authority Scope      => authority active
Change Limit                => authority active
Suspend Authority           => authority suspended
Terminate Authority         => authority terminated
Correction Entry            => corrected target state
Reversal Entry              => reversal/previous effective state
```

---

### Database Acceptance Rule

Before marking a lifecycle/operation page as complete, verify migrations and DB constraints.

Required checks:

```text
table exists
transaction table exists
current view exists
tenant_id exists
RLS or tenant scope exists
check constraints match conceptual lifecycle
old invalid status values are migrated
indexes exist for tenant/company/record/effective date fields
current view returns the fields expected by API/frontend
```

If migration files cannot be found or verified, do not mark the task complete.

---

### Representative DB Rules

For representatives:

```text
company_representatives.record_status
```

must only allow:

```text
draft
active
passive
```

Old values must be migrated:

```text
suspended  -> active
expired    -> active
terminated -> active
```

because these are authority states, not main card states.

Representative authority current state must come from:

```text
v_current_representative_authorities
```

The view must expose:

```text
representative_id
company_id
tenant_id
authority_status
authority_record_status
authority_status_label
authority_types
signature_type
transaction_limit
payment_approval_limit
purchase_approval_limit
bank_transaction_limit
contract_signature_limit
currency
limits
scope
requires_joint_signature
can_approve_alone
effective_date
end_date
warnings
last_transaction_id
last_transaction_type
```

---

### Atomicity Rule

Official operations must be atomic.

Do not split these into independent non-transactional writes:

```text
operation request creation/update
transaction row insert
main record patch
outbox event creation
```

Use a DB transaction or RPC when multiple writes must succeed/fail together.

Preferred pattern:

```sql
perform_representative_authority_transaction(...)
perform_ownership_transaction(...)
```

The RPC / transaction should:

```text
lock the main row
check optimistic version
validate lifecycle transition
insert transaction row
patch main record if required
update operation request
insert outbox event
commit or rollback as one unit
```

---

### Delete Policy Rule

Hard delete is allowed only for records that have not entered lifecycle/business operations.

For representatives, hard delete is allowed only when:

```text
record_status = draft
is_deleted = false
no authority transaction exists
```

Active, suspended-authority, terminated-authority or transaction-history records must not be hard deleted.

The API should return a clear conflict code such as:

```text
REPRESENTATIVE_DELETE_REQUIRES_TERMINATION
```

---

### Type Contract Rule

After changing lifecycle or payload semantics, update all shared types.

If a DB field is constrained to:

```ts
'draft' | 'active' | 'passive'
```

then no shared frontend/backend type may still allow:

```ts
'suspended' | 'expired' | 'terminated'
```

Those values must belong to authority/current-view types, not main record types.

---

### Final Acceptance Checklist for Lifecycle Pages

Before saying a page is complete, check:

```text
[ ] List starts with lifecycle icon column.
[ ] List has no action column, rowActions or inline operation buttons.
[ ] Row click opens form in view mode.
[ ] Form uses operationActions for lifecycle/official operations.
[ ] Create form creates only a draft card.
[ ] Official operations are wizard/transaction based.
[ ] Normal update cannot mutate official operation fields.
[ ] Payload pipeline is checked end-to-end.
[ ] Backend guards lifecycle transitions.
[ ] DB migrations exist and are verified.
[ ] Current view/read model returns correct calculated state.
[ ] Shared types match DB constraints.
[ ] Workflow is not hard-coded in frontend.
[ ] Official operations are atomic or implemented via RPC.
[ ] Delete policy blocks hard delete after lifecycle entry.
```

## Architecture Patterns (Non-negotiable)

### 1. Directory Structure
```
app/
├── app/                    # (auth-protected)
│   ├── ik/                 # İK module pages
│   ├── muhasebe/           # Muhasebe module pages
│   ├── sistem/             # System admin pages
│   └── page.tsx            # Dashboard (home)
├── api/                    # API routes (minimal)
├── auth/                   # Auth-related pages
├── layout.tsx              # Root layout (Sidebar + Nav)
components/
├── ui/                     # Generic UI components
│   ├── PageBanner.tsx      # Page header component
│   ├── SmartDataTable.tsx  # Data table with advanced features
│   ├── EntityForm.tsx      # Create/View/Edit form wrapper
│   └── ...
├── modules/                # Module-specific components
│   ├── ik/
│   ├── muhasebe/
│   └── ...
hooks/                      # Custom data fetching hooks
│   ├── usePersonel.ts
│   ├── useNakitIslemler.ts
│   └── ...
lib/
├── utils.ts                # Utility functions (formatTRY, cn, etc.)
├── supabase.ts             # Supabase client
└── constants.ts            # App constants
types/                      # Global TypeScript types
docs/                       # Documentation
.windsurf/workflows/        # Task-specific workflows
```

### 2. Component Patterns

#### PageBanner (Header Component)
```typescript
// MUST include mode prop
<PageBanner
  mode="list" | "form"          // Required!
  title="string"
  subtitle?: "string"
  icon={<Icon />}
  onAddClick?: () => void       // list mode
  addButtonText?: "string"      // list mode
  onBackClick?: () => void     // form mode
  backButtonText?: "string"     // form mode
/>
```

#### SmartDataTable
- Generic TypeScript support required
- Column definitions with `ColumnDef<T>`
- Built-in filtering, sorting, pagination
- Column visibility persistence (localStorage)
- Card view mode support

#### EntityForm
- Three modes: 'create' | 'view' | 'edit'
- Hero section with photo + required fields
- Tab-based organization for detailed fields
- Built-in save/cancel/delete actions

### 3. Data Fetching Pattern

Frontend business data access must follow `FrontendDataAccessRules.md`. Primary ERP list pages must also follow `docs/templates/FastEntityListTemplate.md`: use a service built on `apiClient`, keep list/detail GETs cacheable, set the selected row and open the form before awaiting detail data, and keep list API selects narrow.

Do not introduce direct Supabase table access in frontend hooks or pages. Do not add row detail cache busters such as `?t=${Date.now()}` or `cache: 'no-store'` unless the endpoint is explicitly real-time and the reason is documented.

```typescript
// Custom hook structure
export function useEntityName(options?: FilterOptions) {
  const [data, setData] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [options])

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await entityService.list(options, { useCache: true })
      setData(result.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => fetchData()
  
  return { data, loading, error, refetch }
}
```

### 4. Styling Conventions

#### Color System (Eden Theme)
```typescript
// Custom colors defined in globals.css or tailwind config
eden-blue: '#216688'           // Primary
eden-blue-dk: '#1a526d'        // Primary dark
eden-gold: '#c49a10'           // Accent
eden-green: '#0d9488'          // Success
eden-navy: '#0f172a'           // Dark background
eden-navy-2: '#1e293b'         // Dark card
```

#### Component Classes
- Cards: `card`, `card-hdr`, `card-title`
- Tables: `data-table`
- Forms: existing Eden form primitives and shadcn-style composition where already available
- Buttons: existing Eden button/action primitives
- Inputs: existing Eden input/form primitives

#### Dark Mode
- All components MUST support dark mode
- Use `dark:` Tailwind prefix
- Test both themes

### 5. Form Handling Pattern
```typescript
// Standard form state
const [formData, setFormData] = useState<Partial<Entity>>({})
const [saving, setSaving] = useState(false)

// Change handler
const handleChange = (field: keyof Entity, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}

// Save handler
const handleSave = async () => {
  setSaving(true)
  try {
    if (mode === 'create') {
      await supabase.from('table').insert(formData)
    } else {
      await supabase.from('table').update(formData).eq('id', id)
    }
    showToast('success', 'Kaydedildi')
  } catch (err) {
    showToast('error', err.message)
  } finally {
    setSaving(false)
  }
}
```

### 6. Toast/Notification Pattern
```typescript
const [toast, setToast] = useState<ToastState | null>(null)

// Show toast
setToast({ type: 'success' | 'error' | 'info', message: '...' })

// In JSX
{toast && <Toast {...toast} onClose={() => setToast(null)} />}
```

## Coding Standards

### TypeScript
- **Strict mode enabled**
- All functions must have return types
- No `any` type (use `unknown` with type guards if necessary)
- Interface names: PascalCase
- Type names: PascalCase with `Type` suffix
- Enum names: PascalCase, values: UPPER_SNAKE_CASE

### Naming Conventions
- **Components**: PascalCase (e.g., `PersonelForm.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `usePersonel.ts`)
- **Files**: camelCase or PascalCase matching default export
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Project naming contract**: frontend state, API payload keys, route params, service types, enum values, and new database identifiers use one canonical English name per concept across the full frontend -> backend -> database pipeline. Turkish is allowed only in user-facing labels, helper text, document titles, and externally mandated legal names. Keep labels in `lib/projectGlossary.ts`. Do not add compatibility aliases or accept multiple field names for the same concept; legacy database columns may only be translated in explicit persistence mappers or rename/backfill migrations.
- **CSS classes**: kebab-case

### File Organization
- One component per file (default export)
- Co-locate related components if < 100 lines total
- Custom hooks in separate `hooks/` directory
- Types in `types/` or co-located if component-specific

## AI Assistant Rules (CRITICAL)

### When User Requests Conflict with Architecture:

**ALWAYS warn the user and propose architectural alternative.**

Examples of conflicts:

| User Request | Conflict | AI Response |
|--------------|----------|-------------|
| "Use Redux for state" | Project uses React hooks + Context | "This project uses React hooks and Context for state management. Redux would add unnecessary complexity. I can implement with Context instead, or if you specifically need Redux, we should update the architecture guide first." |
| "Add Material-UI components" | Project uses Eden custom components and Tailwind | "Adding Material-UI would create visual inconsistency and bundle bloat. I can create the component using the existing Eden/Tailwind component patterns instead." |
| "Use JavaScript instead of TypeScript" | Project is TypeScript-only | "The project requires TypeScript in strict mode. Using JavaScript would break type safety and CI/CD checks. I can write the code in TypeScript with proper types." |
| "Create API routes for CRUD" | Project uses Supabase direct queries | "The project uses Supabase client for database operations directly from components (via hooks). Adding API routes would be an extra layer. However, if you need server-side logic (workflows, validations), we can add specific API routes. Which operations need server-side handling?" |
| "Skip dark mode support" | All components must support dark mode | "Dark mode is a project requirement. All UI components must support it. I'll implement with proper `dark:` prefixes. If you want to discuss removing dark mode globally, that's an architecture decision needing documentation update." |

### Before Implementing Changes:

1. **Check this guide** - Does the request align with established patterns?
2. **If aligned** - Proceed with implementation
3. **If conflicting** - Warn user, explain conflict, propose alternative
4. **If user insists** - Note the exception in comments and suggest updating this guide

### When Creating New Components:

1. Check if similar component exists in:
   - `components/ui/` (generic)
   - `components/modules/[module]/` (module-specific)

2. Reuse existing patterns:
   - Use `PageBanner` for all page headers
   - Use `SmartDataTable` for data listing
   - Use `EntityForm` for create/edit/view forms

3. Follow styling hierarchy:
   - Eden custom components and existing shadcn-style primitives
   - Custom Eden theme (secondary)
   - Tailwind utilities (tertiary)

### When Modifying Existing Code:

1. Read the file first to understand current patterns
2. Match existing code style exactly
3. Don't refactor unrelated code
4. Keep changes minimal and focused

## Module Development Guidelines

### New Module Checklist
- [ ] Create `app/app/[module]/` directory
- [ ] Add module license comment in files: `// MODULE LICENSE: [module]/[submodule]`
- [ ] Create module hook in `hooks/use[Module].ts`
- [ ] Add to `MODULE_ORDER` in `useModuleLicense.ts` if needed
- [ ] Update sidebar navigation
- [ ] Follow existing module patterns (ik, muhasebe as examples)

### Module Page Structure
```typescript
// Standard module page pattern
export default function ModulePage() {
  const [pageState, setPageState] = useState<'list' | 'create' | 'edit' | 'view'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  
  const { data, loading, refetch } = useModuleData()

  // Event handlers
  const handleAdd = () => setPageState('create')
  const handleEdit = (id: string) => { setSelectedId(id); setPageState('edit') }
  const handleView = (id: string) => { setSelectedId(id); setPageState('view') }
  const handleSave = async (data) => { /* ... */ }
  const handleCancel = () => setPageState('list')

  // Determine form mode for display
  const formMode = pageState === 'create' ? 'create' : 
                   pageState === 'edit' ? 'edit' : 'view'

  return (
    <div className="relative">
      <PageBanner
        mode={pageState === 'list' ? 'list' : 'form'}
        title="Module Title"
        icon={<Icon />}
        {...pageState === 'list' ? {
          onAddClick: handleAdd,
          addButtonText: "Yeni Ekle"
        } : {
          onBackClick: handleCancel,
          backButtonText: "Listeye Dön"
        }}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* List View */}
      {pageState === 'list' && (
        <SmartDataTable
          data={data}
          columns={columns}
          onRowClick={handleView}
          // ... other props
        />
      )}

      {/* Form View */}
      {pageState !== 'list' && (
        <EntityForm
          mode={formMode}
          entityName="EntityName"
          data={selectedData}
          onSave={handleSave}
          onCancel={handleCancel}
          // ... other props
        />
      )}
    </div>
  )
}
```

## Workflow Engine Integration (Future)

When implementing workflow features (see `docs/architecture/WorkflowEngine.md`):

1. Forms become workflow-triggerable
2. Form submissions create workflow instances
3. Header notification bell shows pending approvals
4. Approval lists navigate to list pages

**Current phase**: Building organizational structure (departments, positions, roles) to support future workflow assignments.

## Critical Reminders for AI

### NEVER:
- Skip TypeScript types
- Skip dark mode support
- Use `any` type without @ts-ignore and justification
- Create new component libraries (use existing Eden/Tailwind component patterns)
- Add unnecessary dependencies
- Break existing patterns without warning

### ALWAYS:
- Check this guide before major changes
- Match existing code style
- Add `mode` prop to PageBanner
- Support both list/form modes in pages
- Use proper TypeScript generics for table components
- Test type safety with `npm run build`

## Communication Style

When user requests something:

1. **Acknowledge** the request briefly
2. **Verify** against this guide
3. **Act** if aligned, or **warn + propose alternative** if conflicting
4. **Summarize** what was done

Example good response:
> "Adding `deleting` prop to EntityForm interface. This aligns with the existing pattern where EntityForm handles all entity lifecycle actions."

Example warning response:
> "I notice you want to add Redux for this feature. The project currently uses React hooks + Context for state management as defined in the architecture. Adding Redux would introduce unnecessary complexity and bundle size. 
> 
> **Alternative**: I can implement this with Context API which follows the established pattern. Would you like me to proceed that way, or do you have specific requirements that necessitate Redux (like time-travel debugging, complex middleware needs)?"

## Special Commands

### `/add_ux_rule` - Add New UX Rule

**When user says**: `/add_ux_rule` or "Yeni UX kuralı ekle" or "Add UX rule"

**AI Action**:
1. Ask user for rule details if not provided
2. Read `docs/UI_UX_DESIGN_RULES.md`
3. Append new rule to "Established UX Rules Log" section
4. Update "Last Updated" date
5. Commit with message: `docs: Add UX rule - [Rule Name]`

**Rule Format**:
```markdown
### Rule [N]: [Rule Name]
**Added**: [Current Date]
**Context**: [Where it applies]

[Detailed description]

**Example**:
```tsx
[Code example if applicable]
```
```

**Example Usage**:
> User: `/add_ux_rule`
> 
> AI: "Hangi konuda yeni UX kuralı eklemek istiyorsunuz? Lütfen kural adı ve açıklamasını verin."
> 
> User: "Modal pencerelerde arka plan tıklaması ile kapanma zorunlu"
> 
> AI: [Updates UI_UX_DESIGN_RULES.md with new rule]

---

### `/document_page` - Document Page Specification

**When user says**: `/document_page [page-path]` or "Sayfa detaylarını yaz"

**AI Action**:
1. Create `docs/pages/[page-path].md`
2. Document page purpose, components, data flow
3. Include field specifications, validations
4. Add to page index

---

## ⚠️ CRITICAL: Component API Verification

**NEVER assume prop names. ALWAYS check component source first.**

### High-Risk Components (Frequent Mistakes)

#### 1. PageBanner - Common Errors

```typescript
// ❌ WRONG - These props DO NOT EXIST:
<PageBanner
  onActionClick={...}     // WRONG - use onAddClick
  actionLabel="..."        // WRONG - use addButtonText  
  onNewClick={...}        // WRONG - use onAddClick
  mode="view"             // WRONG - use 'form' + formMode
/>

// ✅ CORRECT:
<PageBanner
  mode="list"             // or "form"
  onAddClick={...}        // list mode
  addButtonText="..."
/>

// ✅ CORRECT for View/Edit:
<PageBanner
  mode="form"
  formMode="view"         // "create" | "view" | "edit"
  onBackClick={...}
/>
```

**Check**: `components/ui/PageBanner.tsx`

#### 2. SmartDataTable - Common Errors

```typescript
// ❌ WRONG - These props DO NOT EXIST:
<SmartDataTable
  entityName="..."        // WRONG - not used
  groupByCategory         // WRONG - not a prop
  showExport              // WRONG - built-in feature
  columnSelector          // WRONG - built-in feature
  views={{...}}           // WRONG - not supported
  defaultView="default"   // WRONG - use "list" or "card"
/>

// ✅ CORRECT:
<SmartDataTable
  data={...}
  columns={...}
  defaultView="list"      // "list" | "card"
  onRowClick={...}
/>
```

**Check**: `components/ui/SmartDataTable.tsx`

#### 3. EntityForm - Common Errors

```typescript
// ❌ WRONG:
<EntityForm
  entityName="..."        // Use entityNameSingular
  heroTitle="..."         // Not needed
  onAction={...}          // Use onSave
/>

// ✅ CORRECT:
<EntityForm
  mode="create"           // "create" | "view" | "edit"
  entityName="Şirket"
  entityNameSingular="Şirket"
  heroFields={[...]}
  tabs={[...]}
  onSave={...}
  onCancel={...}
/>
```

**Check**: `components/ui/EntityForm.tsx`

### Verification Checklist

Before using ANY component:

1. **Open the component file** (Ctrl+Click on import)
2. **Read the interface definition** at the top
3. **Copy exact prop names**
4. **Check for type unions** (e.g., `'list' | 'card'`)
5. **Note required vs optional props**

### Template References

- `docs/templates/PageBanner-API.md` - Complete API reference
- `docs/templates/SmartDataTable-API.md` - Complete API reference
- `docs/templates/ERPPageTemplate-UPDATED.md` - Full page pattern

### UI Design Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| **No Duplicate Titles** | SmartDataTable should NOT have `title` prop when PageBanner is present | STRICT |
| **Action Column Visibility** | SmartDataTable does not render row-level action columns; lifecycle/operation actions belong in the form/detail surface | REQUIRED |
| **PageBanner Pattern** | Use `mode="list"` with `onAddClick` OR `mode="form"` with `onBackClick` | STRICT |
| **Standardized Add Button** | `addButtonText` is always "Ekle" on all pages (no customization) | STRICT |
| **Image Components** | ONLY `ImageSlotUploader` for ALL image operations | STRICT |
| **Document Components** | ONLY `DocumentSlotUploader` for ALL document operations | STRICT |
| **User Avatar** | ONLY `UserAvatar` component for user photos/initials - NO custom avatar solutions | STRICT |
| **Form Hero Layout** | Left panel: Top=ImageSlotUploader (expected, not required), Bottom=DocumentSlotUploader (optional) | STRICT |

**Why "Ekle" is Standardized?**
- Consistency across all ERP pages
- Users learn the pattern once, applies everywhere
- PageBanner title already provides context (e.g., "Çalışanlar" → Add implies adding a personel)
- Prevents visual clutter with varying button text lengths

**Correct Pattern:**
```tsx
// All pages use the same text
<PageBanner
  title="Çalışanlar"           // Context here
  addButtonText="Ekle"        // Always "Ekle"
/>

<PageBanner
  title="Şirketler"            // Different context
  addButtonText="Ekle"        // Same button text
/>

**Why No Duplicate Titles?**
- PageBanner already defines the page content with its title
- SmartDataTable having a separate title creates visual redundancy
- Example: PageBanner says "Çalışanlar", SmartDataTable should NOT say "Personel Listesi"

**Correct Pattern:**
```tsx
// PageBanner provides the page title
<PageBanner
  mode="list"
  title="Çalışanlar"
  onAddClick={handleAdd}
/>

// SmartDataTable has NO title prop
<SmartDataTable
  data={data}
  columns={columns}
  // ❌ NO title prop here
/>
```

### Build-Blocking Mistakes Log

| Date | Component | Mistake | Status |
|------|-----------|---------|--------|
| 2024-05-01 | PageBanner | `mode="view"` | Fixed |
| 2024-05-01 | PageBanner | `onActionClick` | Fixed |
| 2024-05-01 | SmartDataTable | `entityName`, `views` | Fixed |
| 2024-05-01 | SmartDataTable | `defaultView="default"` | Fixed |

---

**Last Updated**: 2024-05-01
**Maintained by**: AI Assistants + Human Review
**Enforcement**: STRICT - All AI must follow and warn on conflicts

## Codex Working Copy and Environment Preservation Rule

Codex aktif gelistirmeyi tek kalici branch olan `main` uzerinde yapar. Local ve canli ortam ayrimi branch ile degil, ortam degiskenleri ve ayri Supabase project'leri ile saglanir.

Migration, seed, demo data, reset ve schema degisiklikleri yalnizca Development Supabase project uzerinde yapilir. Release Supabase project protected environment'tir; acik release migration onayi olmadan degistirilmez:

```text
ALLOW_RELEASE_DB_MIGRATION=true
RELEASE_MIGRATION_APPROVED_BY=<name>
```

Release ortaminda seed, demo seed ve reset calismaz. Yeni sayfa once `releaseStatus=development` olarak baslar. Test/onay olmadan `releaseStatus=release` yapilmaz. Demo/test/placeholder sayfa release ortaminda gorunmez. Release ortaminda debug, demo, environment ve sayfa status badge'leri normal kullaniciya gosterilmez. Yarım modul release ortaminda normal kullaniciya acilmaz.

Development and Release use the same `main` code with different environment values:

```text
local machine  -> main -> .env.local                  -> Development Supabase
Virtual Server -> main -> /etc/eden-erp/eden-erp.env  -> Release Supabase + VS Ollama
```
# Remote Server + Local DB Canonical Context

Current Eden ERP work happens on the remote server. The canonical runtime is Next.js UI/BFF, FastAPI backend, app-session auth, trusted proxy context and local PostgreSQL/local DB. Do not add new Supabase/Vercel-dependent code paths. Existing Supabase modules are legacy migration inventory unless a task explicitly asks to touch them.
