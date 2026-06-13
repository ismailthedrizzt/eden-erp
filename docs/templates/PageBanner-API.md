# PageBanner Component API

<!-- source-of-truth-standard: contract overrides markdown -->

**Current as of May 2024**

## Props Reference

```typescript
export type PageBannerMode = 'list' | 'form'
export type FormSubMode = 'create' | 'view' | 'edit'

export interface PageBannerProps {
  /** Page mode - determines which button to show */
  mode: PageBannerMode
  
  /** Page title */
  title: string
  
  /** Page subtitle */
  subtitle?: string
  
  /** Icon component (usually Lucide icon) */
  icon?: ReactNode
  
  /** Form sub-mode (for icon selection when mode='form') */
  formMode?: FormSubMode
  
  /** Click handler for Add button (LIST MODE ONLY) */
  onAddClick?: () => void
  
  /** Click handler for Back button (FORM MODE ONLY) */
  onBackClick?: () => void
  
  /** Add button text (LIST MODE) */
  addButtonText?: string
  
  /** Back button text (FORM MODE) */
  backButtonText?: string
  
  /** Custom button icon */
  customButtonIcon?: ReactNode
  
  /** Additional CSS classes */
  className?: string
}
```

## Usage Examples

### List Mode

**⚠️ UI Rule: addButtonText is always "Ekle" (standardized across all pages)**

```tsx
// ❌ WRONG - Custom button text
addButtonText="Yeni Personel"
addButtonText="Yeni Şirket"
addButtonText="Yeni İşlem"

// ✅ CORRECT - Standard text
addButtonText="Ekle"
```

```tsx
<PageBanner
  mode="list"
  title="Personel Yönetimi"
  subtitle="Tüm çalışanlar"
  icon={<Users size={24} />}
  onAddClick={() => setPageState('create')}
  addButtonText="Ekle"
/>
```

### Form Mode - Create
```tsx
<PageBanner
  mode="form"
  formMode="create"
  title="Yeni Personel"
  subtitle="Yeni kayıt oluşturun"
  icon={<UserPlus size={24} />}
  onBackClick={() => setPageState('list')}
  backButtonText="Listeye Dön"
/>
```

### Form Mode - View
```tsx
<PageBanner
  mode="form"
  formMode="view"
  title={personel.ad + ' ' + personel.soyad}
  subtitle="Personel detayları"
  icon={<User size={24} />}
  onBackClick={() => setPageState('list')}
  backButtonText="Listeye Dön"
/>
```

### Form Mode - Edit
```tsx
<PageBanner
  mode="form"
  formMode="edit"
  title={personel.ad + ' ' + personel.soyad}
  subtitle="Kaydı düzenleyin"
  icon={<Edit3 size={24} />}
  onBackClick={() => setPageState('list')}
  backButtonText="Listeye Dön"
/>
```

## Common Mistakes

### ❌ WRONG: Using non-existent props
```tsx
<PageBanner
  onActionClick={handleAdd}      // ❌ Doesn't exist!
  actionLabel="Yeni"              // ❌ Doesn't exist!
  onNewClick={handleAdd}          // ❌ Doesn't exist!
  entityName="Personel"           // ❌ Doesn't exist!
/>
```

### ❌ WRONG: Using 'view' as mode
```tsx
<PageBanner
  mode="view"                     // ❌ Must be 'list' or 'form'
/>
```

### ✅ CORRECT: View mode uses 'form' + formMode
```tsx
<PageBanner
  mode="form"
  formMode="view"
/>
```

## Auto-Selected Icons by formMode

When `mode="form"` and no custom `icon` provided:

| formMode | Auto Icon |
|----------|-----------|
| create | `<UserPlus />` |
| view | `<User />` |
| edit | `<Edit3 />` |
| (default) | `<User />` |

For list mode (default): `<Plus />`

---

**Source**: `@/components/ui/PageBanner.tsx`
