# ERP Page Template

**Standardized ERP Data Management Page Pattern**

This document defines the canonical structure for all entity management pages in the Eden ERP system.

---

## Overview

Every data management page in the ERP follows the **same architectural pattern**:

```
┌─────────────────────────────────────────────────────────────┐
│                     PageBanner                              │
│  (Title + Icon + "Create New" Action)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   SmartList / SmartDataTable                        │   │
│  │   (Data Grid with filtering, sorting, pagination)    │   │
│  │                                                     │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐              │   │
│  │   │ Record 1│ │ Record 2│ │ Record 3│ ...            │   │
│  │   └─────────┘ └─────────┘ └─────────┘              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  OR (when record selected / create mode)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │   EntityForm                                        │   │
│  │   ┌─────────────────────────────────────────────┐   │   │
│  │   │ Header (Mode: Create/View/Edit)            │   │   │
│  │   ├─────────────────────────────────────────────┤   │   │
│  │   │ Hero Section (Critical Fields)             │   │   │
│  │   ├─────────────────────────────────────────────┤   │   │
│  │   │ Tabs (Detailed Sections)                    │   │   │
│  │   │   • Contact Info • Employment • Documents   │   │   │
│  │   └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Three Core Components

### 1. PageBanner

**Responsibility**: Page header and entry point for creating new records

**Key Rules**:
- Always displays page title and icon
- "Create New" button **always** opens Form in **Create mode**
- No other actions in the banner (keep it simple)

**Usage**:
```tsx
<PageBanner
  title="Personel Yönetimi"
  icon={<Users size={24} />}
  onAddClick={() => setFormMode('create')}
  addButtonText="Yeni Personel"
/>
```

---

### 2. SmartList (SmartDataTable)

**Responsibility**: Display all records in a searchable, sortable list

**Key Rules**:
- Clicking a record opens Form in **View mode**
- Never navigate to a separate detail page
- Maintain list state (filters, pagination) when form opens

**Usage**:
```tsx
<SmartDataTable
  data={records}
  onRowClick={(record) => {
    setSelectedRecord(record)
    setFormMode('view')
  }}
/>
```

---

### 3. EntityForm

**Responsibility**: Create, View, and Edit records

**Key Rules**:
- **Single component** handles all three modes
- **Never** separate pages for create/view/edit
- Modes are mutually exclusive:
  - `create`: Empty form, validation on save
  - `view`: Read-only, "Edit" button visible
  - `edit`: Pre-filled, validation on save

**Usage**:
```tsx
<EntityForm
  mode={formMode} // 'create' | 'view' | 'edit'
  data={selectedRecord}
  heroFields={[...]}
  tabs={[...]}
  operationActions={[
    {
      key: 'lifecycle',
      title: 'Yaşam Döngüsü İşlemleri',
      actions: [
        { key: 'activate', label: 'Aktifleştir', onClick: startActivationWizard },
      ],
    },
    {
      key: 'update',
      title: 'Tescil İşlemleri',
      actions: [
        { key: 'formal-change', label: 'Resmi Değişiklik Başlat', onClick: startChangeWizard },
      ],
    },
  ]}
  onSave={handleSave}
  onCancel={() => setFormMode('list')}
/>
```

**Operation grouping rule**:
- `lifecycle`: the operation changes the entity life state, such as opening, activation, employee entry/exit, liquidation, or deregistration.
- `update`: the entity stays active, but official/controlled registration data changes through documents, preconditions, approvals, or history snapshots.
- `other`: navigation or related actions that are not lifecycle or controlled update flows.

Fields governed by these flows should use `controlledByOperation`; the form locks them in edit mode and shows the explanatory info icon.

---

## Page State Machine

```
                    ┌─────────────────┐
                    │     LIST        │
                    │   (Initial)     │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     CREATE      │ │      VIEW       │ │      EDIT       │
│   (Add Button)  │ │  (Row Click)    │ │ (Edit Button)   │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         │ Save/Cancel       │ Edit/Save/Cancel  │ Save/Cancel
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐         ┌─────────┐
    │  LIST   │◄────────│  EDIT   │◄────────│  VIEW   │
    │ (Back)  │         │         │         │         │
    └─────────┘         └─────────┘         └─────────┘
```

---

## Implementation Template

### File: `app/app/[module]/[entity]/page.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageBanner } from '@/components/ui/PageBanner'
import { EntityForm, FormField, FormTab, FormMode } from '@/components/ui/EntityForm'
import { SmartDataTable, ColumnDef } from '@/components/ui/SmartDataTable'
import { Toast } from '@/components/ui/Toast'
import { EntityIcon } from 'lucide-react' // Replace with actual icon

// Types
interface Entity {
  id: string
  // ... entity fields
}

type PageState = 'list' | 'create' | 'view' | 'edit'

export default function EntityManagementPage() {
  const router = useRouter()
  
  // State
  const [pageState, setPageState] = useState<PageState>('list')
  const [records, setRecords] = useState<Entity[]>([])
  const [selectedRecord, setSelectedRecord] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Fetch data
  // Performance rule: for primary ERP list pages prefer the service/hook pattern in
  // docs/templates/FastEntityListTemplate.md. Do not use cache-busting detail fetches.
  useEffect(() => {
    fetchRecords()
  }, [])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const result = await entityService.list({}, { useCache: true })
      setRecords(result.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Event Handlers
  const handleAddClick = () => {
    setSelectedRecord(null)
    setPageState('create')
  }

  const handleRowClick = async (record: Entity) => {
    setSelectedRecord(record)
    setPageState('view')

    try {
      const result = await entityService.detail(record.id)
      if (result.data) setSelectedRecord(result.data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSave = async (data: any, mode: FormMode) => {
    setSaving(true)
    try {
      if (mode === 'create') {
        const response = await fetch('/api/[module]/[entity]', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) throw new Error('Create failed')
        setToast({ type: 'success', message: 'Record created' })
      } else {
        const response = await fetch(`/api/[module]/[entity]/${selectedRecord?.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) throw new Error('Update failed')
        setToast({ type: 'success', message: 'Record updated' })
      }
      
      await fetchRecords()
      setPageState('list')
    } catch (err: any) {
      setError(err.message)
      throw err // Re-throw for EntityForm to catch
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRecord) return
    
    try {
      const response = await fetch(`/api/[module]/[entity]/${selectedRecord.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Delete failed')
      
      setToast({ type: 'success', message: 'Record deleted' })
      await fetchRecords()
      setPageState('list')
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  // Configuration
  const heroFields: FormField[] = [
    { name: 'field1', label: 'Field 1', type: 'text', required: true },
    { name: 'field2', label: 'Field 2', type: 'text' }
  ]

  const tabs: FormTab[] = [
    {
      id: 'tab1',
      label: 'Tab 1',
      icon: <Icon1 size={16} />,
      fields: [
        { name: 'field3', label: 'Field 3', type: 'email' }
      ]
    }
  ]

  const columns: ColumnDef[] = [
    { key: 'field1', header: 'Field 1' },
    { key: 'field2', header: 'Field 2' }
  ]

  return (
    <>
      <PageBanner
        title="Entity Management"
        subtitle="Manage entity records"
        icon={<EntityIcon size={24} />}
        onAddClick={handleAddClick}
        addButtonText="New Entity"
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {pageState === 'list' ? (
        <SmartDataTable
          data={records}
          columns={columns}
          loading={loading}
          onRowClick={handleRowClick}
        />
      ) : (
        <EntityForm
          mode={pageState}
          entityName="Entities"
          entityNameSingular="Entity"
          heroFields={heroFields}
          tabs={tabs}
          data={selectedRecord || undefined}
          loading={loading}
          saving={saving}
          error={error}
          onSave={handleSave}
          onCancel={() => setPageState('list')}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
```

---

## Generated Pages

This template generates the following pages:

| Module | Entity | Page Path |
|--------|--------|-----------|
| ik | personel | `/app/ik/personel` |
| crm | musteri | `/app/crm/musteri` |
| stok | urun | `/app/stok/urun` |
| tedarik | tedarikci | `/app/tedarik/tedarikci` |
| finans | fatura | `/app/finans/fatura` |
| ... | ... | ... |

---

## Future Extensions

### Workflow Integration

When a record enters an approval workflow:

```typescript
interface WorkflowPageState extends PageState {
  workflowStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  canSubmitForApproval: boolean
  approvers?: string[]
}

// Form shows "Submit for Approval" instead of "Save"
// When pending: Form is read-only, shows approval status
```

### Permission System

```typescript
interface PermissionAwarePage {
  permissions: {
    canCreate: boolean
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canExport: boolean
  }
}

// UI adapts based on permissions:
// - No "Add" button if !canCreate
// - Read-only form if !canEdit
// - No delete button if !canDelete
```

### Audit Trail

```typescript
interface AuditAwarePage {
  showAuditLog: boolean
  recordHistory: ChangeEvent[]
}

// Form shows "View History" button
// Displays field-level changes with timestamps
```

### Multi-Tenancy

```typescript
interface TenantAwarePage {
  tenantId: string
  isGlobalAdmin: boolean
}

// Records filtered by tenant_id
// Global admins can switch tenants
```

---

## Design Principles

1. **No Separate Pages**: Create/View/Edit are modes, not pages
2. **Consistent UX**: Every entity page works the same way
3. **Mobile-First**: Form can be shown in drawer on mobile
4. **Keyboard Navigation**: Full keyboard support for accessibility
5. **Optimistic Updates**: UI updates immediately, syncs in background

---

## Related Documentation

- `../components/EntityForm.md` - Form component details
- `../components/PageBanner.md` - Header component details
- `../components/SmartDataTable.md` - List component details
