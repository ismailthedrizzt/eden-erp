# İK - Birimler Yönetimi Sayfası

**Module**: İK (ik)  
**Submodule**: Birimler (birimler)  
**Path**: `app/app/ik/birimler/page.tsx`  
**Status**: ⏳ Not Implemented

## Purpose

Organizational department management with hierarchical tree structure. Departments are the foundation for position assignments and workflow approvals.

## Data Model

### Database Table: `departments` (birimler)

```sql
CREATE TABLE birimler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  
  -- Hierarchy
  parent_id UUID REFERENCES birimler(id) NULL,
  level INTEGER DEFAULT 0,  -- 0=root, 1=department, 2=sub-department...
  
  -- Basic Info
  kod VARCHAR(50) UNIQUE NOT NULL,  -- Short code: "IT", "HR", "FIN"
  ad VARCHAR(200) NOT NULL,         -- Full name: "Bilgi Teknolojileri"
  aciklama TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### TypeScript Interface

```typescript
interface Birim {
  id: string
  company_id: string
  parent_id: string | null
  level: number
  kod: string
  ad: string
  aciklama?: string
  is_active: boolean
  
  -- Virtual/Joined
  parent?: Birim
  children?: Birim[]
  kadro_count?: number  -- calculated
  personel_count?: number  -- calculated
}
```

## UI Specifications

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ PageBanner: "Birimler Yönetimi" [Yeni Birim Ekle]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TREE VIEW                                          │   │
│  │                                                     │   │
│  │  ▼ 📁 Şirket Adı                                   │   │
│  │    ├─ ▶ 📂 Yönetim (YON)                           │   │
│  │    ├─ ▼ 📂 İnsan Kaynakları (IK)                   │   │
│  │    │   ├─ 📄 İK Uzmanı Kadrosu                     │   │
│  │    │   └─ 📄 İK Stajyer Kadrosu                    │   │
│  │    ├─ ▶ 📂 Finans (FIN)                           │   │
│  │    └─ ▶ 📂 IT (IT)                                │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ DETAIL PANEL (when node selected)                          │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Birim: İnsan Kaynakları                                 ││
│ │ Kod: IK                                                 ││
│ │ Üst Birim: Yönetim                                      ││
│ │ Durum: Aktif                                            ││
│ │                                                         ││
│ │ [Düzenle] [Sil] [Alt Birim Ekle]                       ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Tree View Features

1. **Expand/Collapse**: Chevron icons
2. **Icons**:
   - Root: 🏢 Building
   - Department: 📁 Folder (closed) / 📂 FolderOpen (open)
   - Position: 👤 User
3. **Context Menu**: Right-click for quick actions
4. **Drag & Drop**: Reorder departments (future)

### Columns for List View (Alternative)

| Key | Label | Type | Width | Notes |
|-----|-------|------|-------|-------|
| kod | Kod | text | 100 | Uppercase |
| ad | Birim Adı | text | 250 | Required |
| parent_ad | Üst Birim | text | 200 | Joined from parent |
| level | Seviye | number | 80 | 0=Root, 1+, indented display |
| kadro_sayisi | Kadro Sayısı | number | 120 | Calculated |
| personel_sayisi | Personel | number | 100 | Calculated |
| is_active | Durum | boolean | 100 | Badge: Aktif/Pasif |

## Form Fields

### Create/Edit Form

```typescript
const formTabs: FormTab[] = [
  {
    id: 'temel',
    label: 'Temel Bilgiler',
    icon: <Info size={18} />,
    fields: [
      {
        name: 'kod',
        label: 'Birim Kodu',
        type: 'text',
        required: true,
        placeholder: 'Örn: IK, FIN, IT'
      },
      {
        name: 'ad',
        label: 'Birim Adı',
        type: 'text',
        required: true,
        placeholder: 'Örn: İnsan Kaynakları'
      },
      {
        name: 'parent_id',
        label: 'Üst Birim',
        type: 'select',
        required: false,
        options: []  -- All active departments except self
      },
      {
        name: 'aciklama',
        label: 'Açıklama',
        type: 'textarea',
        required: false
      },
      {
        name: 'is_active',
        label: 'Aktif',
        type: 'select',
        required: true,
        options: [
          { value: 'true', label: 'Aktif' },
          { value: 'false', label: 'Pasif' }
        ]
      }
    ]
  }
]
```

## Business Rules

1. **Code Uniqueness**: `kod` must be unique per company
2. **Hierarchy Limits**: Max 5 levels deep (prevent infinite nesting)
3. **No Self-Parent**: Cannot set own id as parent_id
4. **No Circular**: Parent chain cannot loop back to self
5. **Cascade Status**: Deactivating parent deactivates children
6. **Deletion Protection**: Cannot delete if has children or positions

## Calculated Fields

```typescript
// kadro_count
const kadro_count = await supabase
  .from('kadrolar')
  .select('*', { count: 'exact', head: true })
  .eq('birim_id', birimId)

// personel_count (across all positions in department)
const personel_count = await supabase
  .from('personel_positions')
  .select('*', { count: 'exact', head: true })
  .in('position_id', positionIds)
  .eq('is_active', true)
```

## Related Pages

- **Teşkilat Şeması**: Visual org chart view (`/ik/teskilat`)
- **Kadrolar**: Position management with department filter
- **Personel**: Staff assignments to departments/positions

## API Endpoints Needed

```typescript
// Get department tree
GET /api/departments/tree?company_id={id}

// Get department with children
GET /api/departments/:id?include=children,kadrolar

// Validation: Check circular reference
POST /api/departments/validate-hierarchy
```

## Implementation Notes

1. Use recursive CTE for tree queries in PostgreSQL
2. Consider using `react-arborist` for tree UI
3. Lazy load children on expand
4. Cache tree structure in localStorage for quick access
5. Visual indentation based on `level` property

## Checklist

- [ ] Create `app/app/ik/birimler/page.tsx`
- [ ] Create `hooks/useBirimler.ts`
- [ ] Create `components/modules/ik/BirimForm.tsx`
- [ ] Create `components/modules/ik/BirimTree.tsx`
- [ ] Add sidebar navigation item
- [ ] Add to module licenses
- [ ] Test hierarchy validation
- [ ] Test cascade deactivation
