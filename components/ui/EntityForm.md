# EntityForm Component

**ERP Entity Form Component** - A reusable, mode-aware form component for managing database records across the ERP system.

## Purpose

`EntityForm` is the **core component** for data management in the ERP system. It provides a standardized interface for:

- **Creating** new records
- **Viewing** existing records (read-only)
- **Editing** existing records

Designed to work with any database entity (Personnel, Customers, Products, Suppliers, etc.)

---

## Architecture

```
┌─────────────────────────────────────────┐
│           EntityForm                    │
├─────────────────────────────────────────┤
│  Header (Mode indicator + Actions)      │
├─────────────────────────────────────────┤
│  Hero Section (Critical fields)         │
├─────────────────────────────────────────┤
│  Tabs (Detailed sections)               │
│  ├─ Tab 1: Contact Info                 │
│  ├─ Tab 2: Employment Details             │
│  └─ Tab 3: Documents                      │
└─────────────────────────────────────────┘
```

---

## Props / Parameters

### Core Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `mode` | `FormMode` | Yes | Current mode: `'create'` \| `'view'` \| `'edit'` |
| `entityName` | `string` | Yes | Plural display name (e.g., "Personel", "Müşteriler") |
| `entityNameSingular` | `string` | Yes | Singular display name (e.g., "Personel", "Müşteri") |
| `heroFields` | `FormField[]` | Yes | Critical/identity fields displayed in hero section |
| `tabs` | `FormTab[]` | Yes | Tab sections for detailed information |

### Data & State Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `Record<string, any>` | - | Current record data (for view/edit modes) |
| `loading` | `boolean` | `false` | Loading state (shows spinner) |
| `saving` | `boolean` | `false` | Save operation in progress |
| `deleting` | `boolean` | `false` | Delete operation in progress |
| `error` | `string \| null` | - | Form-level error message |

### Permission Props (Future: Auth Integration)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `canEdit` | `boolean` | `true` | Whether user can edit records |
| `canCreate` | `boolean` | `true` | Whether user can create records |
| `allowDelete` | `boolean` | `true` | Whether delete action is enabled |

### Event Handlers

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSave` | `(data, mode) => Promise<void> \| void` | Yes | Save handler - receives form data and current mode |
| `onCancel` | `() => void` | Yes | Cancel/close handler |
| `onDelete` | `() => Promise<void> \| void` | No | Delete handler (optional) |
| `onModeChange` | `(mode) => void` | No | Called when mode changes (view → edit) |

### Customization Props

| Prop | Type | Description |
|------|------|-------------|
| `customHero` | `ReactNode` | Override default hero section |
| `headerActions` | `ReactNode` | Additional actions in header |
| `className` | `string` | CSS class for container |

---

## Types

### FormField

```typescript
interface FormField {
  name: string           // Field key (matches DB column)
  label: string          // Display label
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'number' | 'custom'
  required?: boolean     // Validation requirement
  options?: { value: string; label: string }[]  // For select fields
  placeholder?: string
  colSpan?: 1 | 2 | 3    // Grid column span
  render?: (props) => ReactNode  // Custom render function
}
```

### FormTab

```typescript
interface FormTab {
  id: string
  label: string
  icon?: ReactNode
  fields: FormField[]
}
```

### FormMode

```typescript
type FormMode = 'create' | 'view' | 'edit'
```

---

## Usage Examples

### Basic Usage - Create Mode

```tsx
import { EntityForm } from '@/components/ui/EntityForm'

function CreatePersonelPage() {
  const handleSave = async (data, mode) => {
    const response = await fetch('/api/ik/personel', {
      method: 'POST',
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to create')
  }

  return (
    <EntityForm
      mode="create"
      entityName="Personel"
      entityNameSingular="Personel"
      heroFields={[
        { name: 'ad', label: 'Ad', type: 'text', required: true },
        { name: 'soyad', label: 'Soyad', type: 'text', required: true },
        { name: 'tc_kimlik', label: 'TC Kimlik', type: 'text' }
      ]}
      tabs={[
        {
          id: 'contact',
          label: 'İletişim',
          fields: [
            { name: 'email', label: 'E-posta', type: 'email' },
            { name: 'telefon', label: 'Telefon', type: 'tel' }
          ]
        }
      ]}
      onSave={handleSave}
      onCancel={() => router.back()}
    />
  )
}
```

### View/Edit Mode with Mode Switching

```tsx
function PersonelDetailPage({ personel }) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [saving, setSaving] = useState(false)

  const handleSave = async (data) => {
    setSaving(true)
    await fetch(`/api/ik/personel/${personel.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
    setSaving(false)
    setMode('view') // Switch back to view after save
  }

  return (
    <EntityForm
      mode={mode}
      entityName="Personel"
      entityNameSingular="Personel"
      data={personel}
      saving={saving}
      heroFields={[...]}
      tabs={[...]}
      onSave={handleSave}
      onCancel={() => router.push('/app/ik/personel')}
      onDelete={async () => {
        await fetch(`/api/ik/personel/${personel.id}`, { method: 'DELETE' })
        router.push('/app/ik/personel')
      }}
      onModeChange={setMode}
    />
  )
}
```

### Custom Field Rendering

```tsx
<EntityForm
  heroFields={[
    {
      name: 'fotograf',
      label: 'Fotoğraf',
      type: 'custom',
      render: ({ value, onChange, readOnly }) => (
        <ImageUploader
          value={value}
          onChange={onChange}
          disabled={readOnly}
        />
      )
    }
  ]}
  // ...
/>
```

### With Permission Control

```tsx
<EntityForm
  mode="view"
  canEdit={user.permissions.includes('personel.edit')}
  canCreate={user.permissions.includes('personel.create')}
  // ...
/>
```

---

## Mode Behavior

### Create Mode
- Empty form with default values
- All fields editable
- "Kaydet" and "İptal" buttons
- Validation on save

### View Mode
- All fields read-only
- "Düzenle" button (if `canEdit`)
- Close button (X)
- No validation

### Edit Mode
- Pre-populated with existing data
- All fields editable
- "Kaydet", "Sil", "İptal" buttons
- Validation on save

---

## Future Extensibility

### Workflow Integration

```typescript
// Future: Workflow-aware form
interface WorkflowFormProps extends EntityFormProps {
  workflowStatus?: 'draft' | 'pending' | 'approved' | 'rejected'
  onSubmitForApproval?: () => void
  canSubmitForApproval?: boolean
}
```

### Audit Log Integration

```typescript
// Future: Show field change history
interface AuditAwareFormProps {
  showAuditLog?: boolean
  fieldHistory?: Record<string, FieldChange[]>
}
```

### Permission Integration

```typescript
// Future: Field-level permissions
interface PermissionAwareField extends FormField {
  requiredPermission?: string
  readOnlyRoles?: string[]
}
```

### Dynamic Forms

```typescript
// Future: JSON Schema driven forms
interface DynamicFormProps {
  schema: JSONSchema
  uiSchema?: UISchema
}
```

---

## Design Decisions

1. **Single Component, Multiple Modes**: Instead of separate Create/View/Edit pages, one component handles all modes. This ensures consistency and reduces code duplication.

2. **Hero + Tabs Layout**: Critical fields are always visible (hero), while detailed information is organized in tabs. This follows ERP standards (SAP, Odoo).

3. **Declarative Field Configuration**: Fields are configured via arrays rather than JSX. This enables:
   - Dynamic form generation
   - Permission-based field filtering
   - Workflow-driven field visibility

4. **No Built-in Data Fetching**: The component receives data via props. Parent components handle data fetching, keeping EntityForm pure and testable.

5. **Mode Change Callbacks**: The parent controls mode changes, enabling complex workflows (e.g., view → edit → approval → save).

---

## Related Components

- `PageBanner` - Page header with add action
- `SmartDataTable` - List view for selecting records
- `Modal` / `Drawer` - Container for form in overlay

---

## Testing

```tsx
// Test create mode
render(<EntityForm mode="create" ... />)
expect(screen.getByText('Yeni Personel')).toBeInTheDocument()

// Test view mode
render(<EntityForm mode="view" data={{ ad: 'Ali' }} ... />)
expect(screen.getByDisplayValue('Ali')).toBeDisabled()

// Test mode transition
fireEvent.click(screen.getByText('Düzenle'))
expect(onModeChange).toHaveBeenCalledWith('edit')
```
