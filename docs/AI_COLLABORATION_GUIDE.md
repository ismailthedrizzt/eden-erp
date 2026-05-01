# Eden ERP - AI Collaboration Guide

## Purpose

This document ensures consistent, coherent development across all AI-assisted sessions. It serves as the single source of truth for architectural decisions, coding conventions, and design patterns. **AI assistants must follow these guidelines and warn users when requests conflict with established architecture.**

## Project Overview

**Eden ERP** is a comprehensive enterprise resource planning system designed for Turkish companies, supporting multi-company, multi-module operations with workflow approval processes.

### Core Characteristics
- **Multi-tenant**: Supports multiple companies in single instance
- **Modular**: Module-based licensing and activation
- **Workflow-driven**: Form submissions can require approval processes
- **Hierarchical organization**: Department/position/role-based structure
- **PWA-enabled**: Progressive Web App capabilities
- **Dark mode support**: Full dark/light theme implementation

## Tech Stack (Immutable)

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS 4 + custom Eden theme colors
- **UI Components**: shadcn/ui (primary), custom components (secondary)
- **Icons**: Lucide React
- **State Management**: React hooks (useState, useReducer) + Context for global state
- **Data Fetching**: Custom hooks (SWR pattern) + Supabase client

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Realtime**: Supabase Realtime (for notifications)

### Key Dependencies (Locked Versions)
```json
{
  "next": "^15.0.0",
  "react": "^19.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^4.0.0",
  "lucide-react": "latest"
}
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
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        // ... filters
      if (error) throw error
      setData(data || [])
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
- Forms: FormField + Label from shadcn/ui
- Buttons: shadcn/ui Button component
- Inputs: shadcn/ui Input component

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
- **Database tables**: snake_case, Turkish names preferred
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
| "Add Material-UI components" | Project uses shadcn/ui + Tailwind | "The project uses shadcn/ui as the component library. Adding Material-UI would create visual inconsistency and bundle bloat. I can create the component using shadcn/ui patterns instead." |
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
   - shadcn/ui components (primary)
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
- Create new component libraries (use shadcn/ui)
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
