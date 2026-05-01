# PageBanner Component

**ERP Page Header Component** - Standardized page header with title, icon, and primary action button.

## Purpose

`PageBanner` serves as the entry point for ERP pages. It provides:

- **Visual Identity**: Page title with icon and optional subtitle
- **Primary Action**: "Create New Record" button that opens the Form in Create mode
- **Consistent Design**: Gradient background following Eden ERP design system

This component appears at the top of every ERP data management page.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PageBanner                                             │
│  ┌─────────┐  ┌─────────────────────┐  ┌───────────┐  │
│  │  Icon   │  │ Title               │  │  + Ekle   │  │
│  │ (24x24) │  │ Subtitle (optional) │  │  Button   │  │
│  └─────────┘  └─────────────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Props / Parameters

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | Yes | - | Page title |
| `subtitle` | `string` | No | - | Page subtitle/description |
| `icon` | `ReactNode` | Yes | - | Icon component (usually Lucide icon) |
| `onAddClick` | `() => void` | No | - | Click handler for add button |
| `addButtonText` | `string` | No | `"Ekle"` | Add button label |
| `showAddIcon` | `boolean` | No | `true` | Show plus icon in button |
| `buttonIcon` | `ReactNode` | No | - | Custom button icon |

---

## Usage Examples

### Basic Usage

```tsx
import { PageBanner } from '@/components/ui/PageBanner'
import { Users } from 'lucide-react'

function PersonelPage() {
  return (
    <PageBanner
      title="Personel Yönetimi"
      subtitle="Çalışan kayıtlarını görüntüleyin ve yönetin"
      icon={<Users size={24} />}
      onAddClick={() => setShowForm(true)}
      addButtonText="Yeni Personel"
    />
  )
}
```

### With Custom Button Icon

```tsx
<PageBanner
  title="Müşteriler"
  icon={<Building size={24} />}
  onAddClick={() => setShowForm(true)}
  addButtonText="Yeni Müşteri"
  buttonIcon={<PlusCircle size={16} />}
/>
```

### Without Add Button (Read-only Pages)

```tsx
<PageBanner
  title="Raporlar"
  subtitle="Aylık performans raporları"
  icon={<ChartBar size={24} />}
  // No onAddClick = no button
/>
```

### Dynamic Title Based on Selection

```tsx
<PageBanner
  title={selectedRecord ? selectedRecord.ad : "Personel Listesi"}
  subtitle={selectedRecord ? "Kayıt detayları" : "Tüm çalışanlar"}
  icon={<User size={24} />}
  onAddClick={() => setMode('create')}
  addButtonText={selectedRecord ? "Yeni Ekle" : "Personel Ekle"}
/>
```

---

## Integration with EntityForm

The standard ERP page pattern combines `PageBanner` and `EntityForm`:

```tsx
function ERPPage() {
  const [formMode, setFormMode] = useState<'list' | 'create' | 'view'>('list')
  const [selectedRecord, setSelectedRecord] = useState(null)

  return (
    <>
      <PageBanner
        title="Personel"
        icon={<Users size={24} />}
        onAddClick={() => setFormMode('create')}
        addButtonText="Yeni Personel"
      />

      {formMode === 'list' && (
        <SmartDataTable
          onRowClick={(row) => {
            setSelectedRecord(row)
            setFormMode('view')
          }}
        />
      )}

      {(formMode === 'create' || formMode === 'view') && (
        <EntityForm
          mode={formMode === 'create' ? 'create' : 'view'}
          data={selectedRecord}
          onCancel={() => setFormMode('list')}
          onSave={handleSave}
        />
      )}
    </>
  )
}
```

---

## Design System

### Visual Style

- **Background**: Gradient from `eden-blue` to `eden-blue-dk`
- **Text Color**: White
- **Icon Container**: White/10 background with backdrop blur
- **Button**: White/10 background, hover: White/20
- **Border Radius**: `rounded-xl` (12px)
- **Padding**: `p-4 sm:p-6` (responsive)

### Responsive Behavior

| Breakpoint | Layout | Icon Size | Title Size |
|------------|--------|-----------|------------|
| Mobile (<640px) | Stack (vertical) | 40px | 18px |
| Desktop (≥640px) | Row (horizontal) | 48px | 24px |

---

## Future Extensibility

### Multi-Action Header

```typescript
// Future: Multiple action buttons
interface PageBannerV2Props extends PageBannerProps {
  secondaryActions?: {
    label: string
    icon: ReactNode
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }[]
}
```

### Breadcrumb Navigation

```typescript
// Future: Breadcrumb support
interface BreadcrumbPageBannerProps extends PageBannerProps {
  breadcrumbs: { label: string; href?: string }[]
}
```

### Contextual Actions

```typescript
// Future: Actions based on selection
interface ContextualPageBannerProps extends PageBannerProps {
  selectionCount?: number
  bulkActions?: { label: string; onClick: () => void }[]
}
```

### Search Integration

```typescript
// Future: Built-in search
interface SearchablePageBannerProps extends PageBannerProps {
  searchPlaceholder?: string
  onSearch?: (query: string) => void
  searchValue?: string
}
```

---

## Related Components

- `EntityForm` - Form component opened by "Ekle" button
- `SmartDataTable` - Data list displayed below banner
- `Breadcrumb` - Future: Navigation breadcrumbs

---

## Best Practices

1. **Always use with EntityForm**: The "Ekle" button should open EntityForm in Create mode
2. **Consistent Icons**: Use Lucide icons with size={24} for consistency
3. **Descriptive Subtitles**: Help users understand the page purpose
4. **Action-Oriented Titles**: Use verb+noun format (e.g., "Personel Yönetimi" not just "Personel")

---

## Testing

```tsx
// Basic render test
render(<PageBanner title="Test" icon={<Users size={24} />} />)
expect(screen.getByText('Test')).toBeInTheDocument()

// Button click test
const onAddClick = jest.fn()
render(<PageBanner ... onAddClick={onAddClick} />)
fireEvent.click(screen.getByText('Ekle'))
expect(onAddClick).toHaveBeenCalled()

// Responsive test
// Verify layout changes at sm breakpoint
```
