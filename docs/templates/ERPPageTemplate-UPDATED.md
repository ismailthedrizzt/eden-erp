# ERP Page Template - UPDATED

**Standardized ERP Data Management Page Pattern (Updated May 2024)**

> ⚠️ **CRITICAL**: Always check component prop types before using. See `/docs/components/` for latest API.

---

## Quick Reference: Component APIs

### PageBanner Props

```typescript
interface PageBannerProps {
  mode: 'list' | 'form'                    // REQUIRED
  title: string                            // REQUIRED
  subtitle?: string
  icon?: ReactNode
  formMode?: 'create' | 'view' | 'edit'    // Used when mode='form'
  onAddClick?: () => void                 // List mode: Add button
  onBackClick?: () => void                // Form mode: Back button
  addButtonText?: string                   // Default: 'Ekle'
  backButtonText?: string                  // Default: 'Geri'
}
```

**❌ WRONG - Old/Invalid Props:**
```tsx
<PageBanner
  onActionClick={handleAdd}      // ❌ Doesn't exist
  actionLabel="Yeni"              // ❌ Doesn't exist
  onNewClick={handleAdd}          // ❌ Doesn't exist
  mode="view"                     // ❌ Use 'form' + formMode
/>
```

**✅ CORRECT:**
```tsx
// LIST MODE
<PageBanner
  mode="list"
  title="Personeller"
  icon={<Users size={24} />}
  onAddClick={() => setPageState('create')}
  addButtonText="Yeni Personel"
/>

// FORM MODE (Create/View/Edit)
<PageBanner
  mode="form"
  formMode={pageState === 'view' ? 'view' : pageState === 'edit' ? 'edit' : 'create'}
  title={selectedRecord?.name || 'Yeni Kayıt'}
  icon={<User size={24} />}
  onBackClick={() => setPageState('list')}
  backButtonText="Listeye Dön"
/>
```

### SmartDataTable Props

```typescript
interface SmartDataTableProps<T> {
  data: T[]                                    // REQUIRED
  columns: ColumnDef[]                         // REQUIRED
  title?: string
  onRowClick?: (row: T) => void               // Open record
  onRefresh?: () => void
  loading?: boolean
  emptyText?: string
  storageKey?: string                         // Persist preferences
  widgets?: WidgetDef[]
  defaultView?: 'list' | 'card'               // ❌ NOT 'default'
  defaultPageSize?: number
  pageSizeOptions?: number[]
}
```

**❌ WRONG - Invalid Props:**
```tsx
<SmartDataTable
  entityName="Personel"           // ❌ Doesn't exist
  groupByCategory                  // ❌ Doesn't exist
  showExport                       // ❌ Doesn't exist
  columnSelector                   // ❌ Doesn't exist
  views={{...}}                    // ❌ Doesn't exist
  defaultView="default"            // ❌ Use 'list' or 'card'
/>
```

**✅ CORRECT:**
```tsx
<SmartDataTable
  data={records}
  columns={columns}
  loading={loading}
  onRowClick={(row) => {
    setSelectedRecord(row)
    setPageState('view')
  }}
  defaultView="list"
  defaultPageSize={25}
/>
```

---

## Common Mistakes Checklist

Before committing, verify:

### PageBanner
- [ ] Using `mode: 'list' | 'form'` (not 'view')
- [ ] Using `onAddClick` for list mode (not `onActionClick`)
- [ ] Using `onBackClick` for form mode (not `onCancel`)
- [ ] Using `formMode` when `mode="form"`
- [ ] No `actionLabel`, `entityName`, `onNewClick` props

### SmartDataTable  
- [ ] Using `defaultView: 'list' | 'card'` (not 'default')
- [ ] No `entityName`, `groupByCategory`, `showExport`, `columnSelector`, `views` props
- [ ] `onRowClick` handler updates page state to 'view'
- [ ] Row click affordance is left to SmartDataTable; no page-specific hover styling
- [ ] `actions`/`İşlemler` column uses `key: 'actions'` or `type: 'actions'` so action clicks do not open the row

### EntityForm / Custom Forms
- [ ] Mode type: `FormMode = 'create' | 'view' | 'edit'`
- [ ] Using `onSave` and `onCancel` callbacks
- [ ] Form handles its own state internally
- [ ] Text/select/textarea visuals come from `EntityForm` or `formControlClass`; required empty = red, required filled = green, disabled/read-only text remains readable
- [ ] `FormField.render` custom renderers consume the provided `className`/`validationState` props instead of hardcoding border/background/text color classes
- [ ] Form receives `loadStages={formLoadStages}` from the progressive loading helper
- [ ] Other fields populated by a field input/lookup expose the standard `AutomationBadge`; EntityForm fields use `automation` metadata or `type: 'iban'`
- [ ] Row click opens with list snapshot first; detail, master and references complete progressively
- [ ] Page uses `useEntityAccess` for module, permission and workflow-ready access decisions
- [ ] Cross-module fields use `ModuleDependencyGate` or `EntityForm moduleDependencies` instead of failing or disappearing silently
- [ ] Backend mutations still call `requirePermission`; frontend permissions are only UI gating

---

## Page State Machine

```
┌─────────┐     onAddClick      ┌─────────┐
│  LIST   │ ───────────────────►│ CREATE  │
│  mode:  │                     │  mode:  │
│ "list"  │◄────────────────────│ "form"  │
└────┬────┘     onBackClick     │formMode:│
     │                            │"create" │
     │ onRowClick                 └─────────┘
     ▼
┌─────────┐     Edit Button     ┌─────────┐
│  VIEW   │ ───────────────────►│  EDIT   │
│  mode:  │                     │  mode:  │
│ "form"  │◄────────────────────│ "form"  │
│formMode:│    Save/Cancel      │formMode:│
│ "view"  │                     │ "edit"  │
└─────────┘                     └─────────┘
```

---

## Updated Implementation Template

```tsx
'use client'

import { useState, useEffect } from 'react'
import { PageBanner } from '@/components/ui/PageBanner'
import { SmartDataTable, ColumnDef } from '@/components/ui/SmartDataTable'
import { EntityForm } from '@/components/ui/EntityForm'  // or custom form
import { Toast } from '@/components/ui/Toast'
import { EntityIcon } from 'lucide-react'

type PageState = 'list' | 'create' | 'view' | 'edit'

export default function EntityPage() {
  const [pageState, setPageState] = useState<PageState>('list')
  const [selectedRecord, setSelectedRecord] = useState<Entity | null>(null)
  const [records, setRecords] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Load data
  useEffect(() => { fetchRecords() }, [])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/entity')
      const data = await res.json()
      setRecords(data)
    } catch (err) {
      setError('Veri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Event Handlers
  const handleAdd = () => {
    setSelectedRecord(null)
    setPageState('create')
  }

  const handleRowClick = (row: Entity) => {
    setSelectedRecord(row)
    setPageState('view')
  }

  const handleBack = () => {
    setPageState('list')
    setSelectedRecord(null)
    fetchRecords() // Refresh list
  }

  const handleSave = async (data: Record<string, any>, mode: PageState) => {
    setSaving(true)
    try {
      if (mode === 'create') {
        await fetch('/api/entity', { method: 'POST', body: JSON.stringify(data) })
        setToast({ type: 'success', message: 'Kayıt oluşturuldu' })
      } else {
        await fetch(`/api/entity/${selectedRecord?.id}`, { method: 'PATCH', body: JSON.stringify(data) })
        setToast({ type: 'success', message: 'Kayıt güncellendi' })
      }
      handleBack()
    } catch (err) {
      setError('Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  // LIST VIEW
  if (pageState === 'list') {
    return (
      <div className="space-y-6">
        <PageBanner
          mode="list"
          title="Entity Yönetimi"
          icon={<EntityIcon size={24} />}
          onAddClick={handleAdd}
          addButtonText="Yeni Entity"
        />

        <SmartDataTable
          data={records}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
          defaultView="list"
        />
      </div>
    )
  }

  // FORM VIEW (Create/View/Edit)
  return (
    <div className="space-y-6">
      <PageBanner
        mode="form"
        formMode={pageState === 'view' ? 'view' : pageState === 'edit' ? 'edit' : 'create'}
        title={selectedRecord?.name || 'Yeni Entity'}
        icon={<EntityIcon size={24} />}
        onBackClick={handleBack}
        backButtonText="Listeye Dön"
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <EntityForm
        mode={pageState}
        data={selectedRecord}
        onSave={handleSave}
        onCancel={handleBack}
        saving={saving}
      />

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
```

---

## Related Documentation

- `@/components/ui/PageBanner.tsx` - Component source + full props
- `@/components/ui/SmartDataTable.tsx` - Component source + full props
- `@/components/ui/EntityForm.tsx` - Component source + full props
- `docs/UI_UX_DESIGN_RULES.md` - UX guidelines

---

**Last Updated**: 2024-05-01
**Maintained by**: AI Assistants
