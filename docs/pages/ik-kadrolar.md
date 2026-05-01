# İK - Kadro Yönetimi Sayfası

**Module**: İK (ik)  
**Submodule**: Kadrolar (kadrolar)  
**Path**: `app/app/ik/kadrolar/page.tsx`  
**Status**: ⏳ Not Implemented

## Purpose

Position (kadro) management within organizational hierarchy. Positions represent job roles within departments and are crucial for workflow approval assignments.

## Data Model

### Database Table: `kadrolar` (positions)

```sql
CREATE TABLE kadrolar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  
  -- Department Link
  birim_id UUID NOT NULL REFERENCES birimler(id),
  
  -- Hierarchy for Relative Rules
  level INTEGER DEFAULT 1,  -- 1=entry, 2=senior, 3=lead, 4=manager, 5=director
  parent_kadro_id UUID REFERENCES kadrolar(id) NULL,  -- Reports to
  
  -- Position Info
  kod VARCHAR(50) NOT NULL,  -- Short code, unique per company
  unvan VARCHAR(200) NOT NULL,  -- Full title: "Kıdemli Yazılım Geliştirici"
  aciklama TEXT,
  
  -- Workflow Properties (CRITICAL for Process Engine)
  -- Who can approve in workflows when this position is selected
  onay_yetkisi BOOLEAN DEFAULT false,  -- Can this position approve?
  
  -- Capacity
  max_personel INTEGER DEFAULT 1,  -- 0=unlimited, 1=single, n=multiple
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, kod)
);
```

### Relative Rule Support

```sql
-- View for resolving relative positions
CREATE VIEW kadro_hiyerarsi AS
WITH RECURSIVE hiyerarsi AS (
  SELECT 
    k.id,
    k.birim_id,
    k.parent_kadro_id,
    k.level,
    k.unvan,
    0 as relative_level
  FROM kadrolar k
  WHERE k.parent_kadro_id IS NULL
  
  UNION ALL
  
  SELECT 
    k.id,
    k.birim_id,
    k.parent_kadro_id,
    k.level,
    k.unvan,
    h.relative_level + 1
  FROM kadrolar k
  JOIN hiyerarsi h ON k.parent_kadro_id = h.id
)
SELECT * FROM hiyerarsi;
```

### TypeScript Interface

```typescript
interface Kadro {
  id: string
  company_id: string
  birim_id: string
  level: number  -- 1-5 scale
  parent_kadro_id: string | null
  
  kod: string           -- "SR-DEV", "MGR-HR"
  unvan: string         -- "Kıdemli Yazılım Geliştirici"
  aciklama?: string
  
  onay_yetkisi: boolean
  max_personel: number
  is_active: boolean
  
  -- Joined
  birim?: Birim
  parent_kadro?: Kadro
  mevcut_personel?: number  -- calculated
  bos_kontenjan?: number    -- calculated
}
```

## UI Specifications

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ PageBanner: "Kadro Yönetimi" [Yeni Kadro Ekle]               │
├─────────────────────────────────────────────────────────────┤
│ [Filtre: Tüm Birimler ▼] [Filtre: Seviye ▼] [Ara...]        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SmartDataTable                                          │ │
│ │                                                         │ │
│ │ Kod    │ Unvan              │ Birim     │ Seviye │ Dol │ │
│ │────────┼────────────────────┼───────────┼────────┼─────│ │
│ │ CEO    │ Genel Müdür        │ Yönetim   │ 5      │ 1/1 │ │
│ │ IT-MGR │ IT Müdürü          │ IT        │ 4      │ 1/1 │ │
│ │ HR-LEAD│ İK Takım Lideri    │ İK        │ 3      │ 0/1 │ │
│ │ SR-DEV │ Kıdemli Yazılımcı  │ IT        │ 2      │ 2/3 │ │
│ │ DEV    │ Yazılım Geliştirici│ IT        │ 1      │ 3/5 │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Legend: 🟢 Dolu  🟡 Kontenjan Var  🔴 Boş                  │
└─────────────────────────────────────────────────────────────┘
```

### Table Columns

| Key | Label | Type | Width | Sort | Notes |
|-----|-------|------|-------|------|-------|
| kod | Kod | text | 100 | ✓ | Uppercase, company unique |
| unvan | Ünvan | text | 250 | ✓ | Required |
| birim_ad | Birim | text | 200 | ✓ | Joined from birimler |
| level | Seviye | enum | 100 | ✓ | 1-5 with labels |
| parent_unvan | Raporlar | text | 200 | - | Parent position |
| max_personel | Kontenjan | number | 120 | ✓ | Max capacity |
| mevcut_doluluk | Doluluk | text | 120 | - | "2/5" format |
| onay_yetkisi | Onay Yetkisi | boolean | 120 | ✓ | Badge: Var/Yok |
| is_active | Durum | boolean | 100 | ✓ | Badge: Aktif/Pasif |

### Column Categories

```typescript
const columns: ColumnDef[] = [
  { key: 'kod', label: 'Kod', category: 'Kimlik' },
  { key: 'unvan', label: 'Ünvan', category: 'Kimlik' },
  { key: 'birim_ad', label: 'Birim', category: 'Organizasyon' },
  { key: 'level', label: 'Seviye', category: 'Organizasyon' },
  { key: 'parent_unvan', label: 'Raporlar', category: 'Organizasyon' },
  { key: 'max_personel', label: 'Kontenjan', category: 'Kapasite' },
  { key: 'mevcut_doluluk', label: 'Doluluk', category: 'Kapasite' },
  { key: 'onay_yetkisi', label: 'Onay Yetkisi', category: 'Yetki' },
  { key: 'is_active', label: 'Durum', category: 'Durum' }
]
```

## Form Specification

### Hero Fields (Required)

```typescript
const heroFields: FormField[] = [
  {
    name: 'kod',
    label: 'Kadro Kodu',
    type: 'text',
    required: true,
    placeholder: 'Örn: IT-MGR, HR-LEAD'
  },
  {
    name: 'unvan',
    label: 'Ünvan',
    type: 'text',
    required: true,
    placeholder: 'Örn: IT Müdürü'
  },
  {
    name: 'birim_id',
    label: 'Bağlı Birim',
    type: 'select',
    required: true,
    options: []  -- Active departments
  }
]
```

### Tabs

**Tab 1: Organizasyon**
```typescript
{
  id: 'organizasyon',
  label: 'Organizasyon',
  fields: [
    {
      name: 'level',
      label: 'Hiyerarşi Seviyesi',
      type: 'select',
      required: true,
      options: [
        { value: 1, label: '1 - Uzman/Çalışan' },
        { value: 2, label: '2 - Kıdemli Uzman' },
        { value: 3, label: '3 - Takım Lideri' },
        { value: 4, label: '4 - Müdür' },
        { value: 5, label: '5 - Genel Müdür/Direktör' }
      ]
    },
    {
      name: 'parent_kadro_id',
      label: 'Raporladığı Kadro',
      type: 'select',
      options: []  -- Same/other department positions
    }
  ]
}
```

**Tab 2: Kapasite ve Yetki**
```typescript
{
  id: 'kapasite',
  label: 'Kapasite ve Yetki',
  fields: [
    {
      name: 'max_personel',
      label: 'Maksimum Personel',
      type: 'number',
      required: true,
      placeholder: '0 = Sınırsız, 1, 2, ...'
    },
    {
      name: 'onay_yetkisi',
      label: 'Onay Yetkisi',
      type: 'select',
      required: true,
      options: [
        { value: 'true', label: '✓ Onay verebilir' },
        { value: 'false', label: '✗ Onay yetkisi yok' }
      ]
    },
    {
      name: 'is_active',
      label: 'Durum',
      type: 'select',
      required: true,
      options: [
        { value: 'true', label: 'Aktif' },
        { value: 'false', label: 'Pasif' }
      ]
    },
    {
      name: 'aciklama',
      label: 'Açıklama',
      type: 'textarea',
      placeholder: 'Kadro görev ve sorumlulukları...'
    }
  ]
}
```

**Tab 3: Atamalar (View Only)**
```typescript
{
  id: 'atamalar',
  label: 'Personel Atamaları',
  icon: <Users size={18} />,
  render: () => <PersonelAtamaListesi kadroId={id} />  // Custom component
}
```

## Special Features

### 1. Doluluk Göstergesi

Visual indicator showing position fill rate:

```tsx
function DolulukGostergesi({ mevcut, max }: { mevcut: number; max: number }) {
  const doluluk = max === 0 ? 0 : (mevcut / max) * 100
  
  let color = 'bg-green-500'
  if (doluluk >= 100) color = 'bg-red-500'
  else if (doluluk >= 80) color = 'bg-yellow-500'
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(doluluk, 100)}%` }} />
      </div>
      <span className="text-sm text-gray-600">
        {mevcut}{max > 0 ? `/${max}` : ''}
      </span>
    </div>
  )
}
```

### 2. Hiyerarşi Görselleştirme

Tree view showing position hierarchy within department.

### 3. Onay Yetkisi Badge

Special styling for positions with approval authority.

## Business Rules

1. **Code Uniqueness**: `kod` unique per company (e.g., "IT-MGR")
2. **Department Required**: Every position must belong to a department
3. **Level Consistency**: Cannot have level 5 under level 3 (parent must be >= child)
4. **Circular Prevention**: Cannot report to self or create loops
5. **Capacity Limit**: Cannot assign more staff than `max_personel`
6. **Workflow Check**: Cannot delete if assigned to active workflows

## Workflow Engine Integration

This is **CRITICAL** for the workflow engine:

### Relative Position Resolution

```typescript
// For workflow: "Assign to parent position"
async function getRelativePosition(
  positionId: string, 
  relativeRule: 'self' | 'parent' | 'sibling' | 'child' | number
): Promise<Kadro | null> {
  const position = await getPosition(positionId)
  
  switch (relativeRule) {
    case 'self':
      return position
    case 'parent':
      return position.parent_kadro_id 
        ? await getPosition(position.parent_kadro_id)
        : null
    case 'sibling':
      // Same level, same department
      return await getSiblingPosition(position)
    case 'child':
      // Direct reports
      return await getChildPosition(position)
    default:
      if (typeof relativeRule === 'number') {
        // N levels up
        return await getNthParent(position, relativeRule)
      }
  }
}
```

### Usage in Workflows

When defining workflow steps:
- Select approver type: "position"
- Select position: "IT-MGR"
- Set relative rule: "parent" → Resolves to "IT" department manager's parent

## Related Pages

- **Birimler**: Department management
- **Teşkilat Şeması**: Visual org chart
- **Personel**: Staff position assignments
- **Süreç Tanımları**: Workflow step position assignments

## Implementation Checklist

- [ ] Create `app/app/ik/kadrolar/page.tsx`
- [ ] Create `hooks/useKadrolar.ts`
- [ ] Create database table and RLS policies
- [ ] Add calculated fields (mevcut_personel)
- [ ] Implement hierarchy validation
- [ ] Add to sidebar navigation
- [ ] Test workflow position resolution
- [ ] Test capacity limits
