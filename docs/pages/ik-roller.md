# İK - Rol Yönetimi Sayfası

<!-- source-of-truth-standard: contract overrides markdown -->

**Module**: İK (ik) / Sistem (sistem)  
**Submodule**: Roller (roles)  
**Path**: `app/app/sistem/roller/page.tsx` (or `/ik/roller`)  
**Status**: ⏳ Not Implemented

## Purpose

Role-based access control (RBAC) management. Roles define permissions and can be assigned to users across the organization. Unlike positions (which are tied to departments), roles are functional and can span departments.

## Data Model

### Database Table: `roller` (roles)

```sql
CREATE TABLE roller (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  
  -- Role Info
  kod VARCHAR(50) NOT NULL,  -- Short code: "ADMIN", "HR_MGR"
  ad VARCHAR(200) NOT NULL,  -- Full name: "Sistem Yöneticisi"
  aciklama TEXT,
  
  -- Scope (where this role applies)
  scope VARCHAR(20) DEFAULT 'company',  -- 'company', 'department', 'tree'
  
  -- Workflow Properties
  onay_yetkisi BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id, kod)
);
```

### Role-Permission Link

```sql
CREATE TABLE rol_izinler (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol_id UUID REFERENCES roller(id) ON DELETE CASCADE,
  
  -- Permission
  modul VARCHAR(50) NOT NULL,    -- 'ik', 'muhasebe', etc.
  alt_modul VARCHAR(50),          -- 'personel', 'kadrolar', etc.
  izin VARCHAR(50) NOT NULL,      -- 'view', 'create', 'edit', 'delete', 'approve'
  
  -- Scope restriction
  kapsam VARCHAR(20) DEFAULT 'all',  -- 'all', 'own', 'department', 'subtree'
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Person-Role Assignment

```sql
CREATE TABLE personel_roller (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personel_id UUID REFERENCES personel(id) ON DELETE CASCADE,
  rol_id UUID REFERENCES roller(id) ON DELETE CASCADE,
  
  -- Scope (if role is department-scoped)
  birim_id UUID REFERENCES birimler(id),  -- NULL = company-wide
  
  -- Assignment period
  baslangic_tarihi DATE DEFAULT CURRENT_DATE,
  bitis_tarihi DATE,  -- NULL = ongoing
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(personel_id, rol_id, birim_id, baslangic_tarihi)
);
```

### TypeScript Interfaces

```typescript
interface Rol {
  id: string
  company_id: string
  
  kod: string        -- "ADMIN", "HR_MGR", "FIN_VIEW"
  ad: string         -- "Sistem Yöneticisi"
  aciklama?: string
  
  scope: 'company' | 'department' | 'tree'
  onay_yetkisi: boolean
  is_active: boolean
  
  -- Joined
  izinler?: RolIzni[]
  atanan_personel_sayisi?: number
}

interface RolIzni {
  id: string
  rol_id: string
  modul: string
  alt_modul?: string
  izin: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'admin'
  kapsam: 'all' | 'own' | 'department' | 'subtree'
}

interface PersonelRol {
  id: string
  personel_id: string
  rol_id: string
  birim_id?: string
  
  baslangic_tarihi: string
  bitis_tarihi?: string
  is_active: boolean
  
  -- Joined
  rol?: Rol
  personel?: Personel
  birim?: Birim
}
```

## UI Specifications

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ PageBanner: "Rol Yönetimi" [Yeni Rol Ekle]                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SmartDataTable                                          │ │
│ │                                                         │ │
│ │ Kod      │ Rol Adı           │ Yetkili │ Atanan │ Durum │ │
│ │──────────┼───────────────────┼─────────┼────────┼───────│ │
│ │ ADMIN    │ Sistem Yöneticisi │ ✓       │ 3      │ Aktif │ │
│ │ HR_MGR   │ İK Yöneticisi     │ ✓       │ 2      │ Aktif │ │
│ │ HR_VIEW  │ İK Görüntüleme    │ ✗       │ 15     │ Aktif │ │
│ │ FIN_MGR  │ Muhasebe Müdürü   │ ✓       │ 2      │ Aktif │ │
│ │ FIN_VIEW │ Muhasebe Görüntüle│ ✗       │ 8      │ Aktif │ │
│ │ USER     │ Standart Kullanıcı│ ✗       │ 45     │ Aktif │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ [Seçili Rol: HR_MGR]                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ İzinler                                                 │ │
│ │ ┌─────────────┬───────────────────────────────────────┐ │ │
│ │ │ Modül       │ İzinler                               │ │ │
│ │ ├─────────────┼───────────────────────────────────────┤ │ │
│ │ │ İK          │ ✓ Görüntüle  ✓ Ekle  ✓ Düzenle      │ │ │
│ │ │ Muhasebe    │ ✗ Görüntüle  ✗ Ekle  ✗ Düzenle      │ │ │
│ │ │ Sistem      │ ✓ Görüntüle  ✗ Ekle  ✗ Düzenle      │ │ │
│ │ └─────────────┴───────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Table Columns

| Key | Label | Type | Width | Notes |
|-----|-------|------|-------|-------|
| kod | Kod | text | 120 | Uppercase |
| ad | Rol Adı | text | 250 | Required |
| scope | Kapsam | text | 120 | Badge: Şirket/Birim/Ağaç |
| onay_yetkisi | Onay Yetkisi | boolean | 120 | Badge: ✓/✗ |
| atanan_personel | Atanan | number | 100 | Calculated count |
| is_active | Durum | boolean | 100 | Badge: Aktif/Pasif |

### Permission Matrix UI

Visual permission editor showing modules vs permissions:

```
                    Görüntüle   Ekle    Düzenle   Sil    Onay    İndir
İK Personel          [✓]       [✓]      [✓]      [✗]    [✓]     [✓]
İK Kadrolar          [✓]       [✓]      [✓]      [✗]    [✗]     [✓]
Muhasebe Dashboard   [✓]       [✗]      [✗]      [✗]    [✗]     [✓]
Muhasebe İşlemler    [✓]       [✓]      [✓]      [✗]    [✓]     [✓]
```

Each cell is a checkbox or tri-state (inherit/explicit allow/explicit deny).

## Form Specification

### Hero Fields

```typescript
const heroFields: FormField[] = [
  {
    name: 'kod',
    label: 'Rol Kodu',
    type: 'text',
    required: true,
    placeholder: 'Örn: HR_MGR, ADMIN'
  },
  {
    name: 'ad',
    label: 'Rol Adı',
    type: 'text',
    required: true,
    placeholder: 'Örn: İK Yöneticisi'
  },
  {
    name: 'scope',
    label: 'Geçerlilik Kapsamı',
    type: 'select',
    required: true,
    options: [
      { value: 'company', label: 'Şirket Geneli' },
      { value: 'department', label: 'Birim Bazlı' },
      { value: 'tree', label: 'Hiyerarşik (Alt Birimler Dahil)' }
    ]
  }
]
```

### Tabs

**Tab 1: Temel Bilgiler**
```typescript
{
  id: 'temel',
  label: 'Temel Bilgiler',
  fields: [
    {
      name: 'aciklama',
      label: 'Açıklama',
      type: 'textarea',
      placeholder: 'Rolün sorumlulukları...'
    },
    {
      name: 'onay_yetkisi',
      label: 'Onay Yetkisi',
      type: 'select',
      options: [
        { value: 'true', label: '✓ Süreçlerde onaylayabilir' },
        { value: 'false', label: '✗ Onay yetkisi yok' }
      ]
    },
    {
      name: 'is_active',
      label: 'Durum',
      type: 'select',
      options: [
        { value: 'true', label: 'Aktif' },
        { value: 'false', label: 'Pasif' }
      ]
    }
  ]
}
```

**Tab 2: İzinler (Custom Component)**
```typescript
{
  id: 'izinler',
  label: 'Modül İzinleri',
  icon: <Shield size={18} />,
  render: () => <RolIzinMatrix rolId={selectedRolId} />
}
```

**Tab 3: Atamalar**
```typescript
{
  id: 'atamalar',
  label: 'Personel Atamaları',
  icon: <Users size={18} />,
  render: () => <RolAtamaListesi rolId={selectedRolId} />
}
```

## Permission System

### Standard Permissions

```typescript
type Permission = 
  | 'view'      -- Read access
  | 'create'    -- Create new records
  | 'edit'      -- Edit existing records
  | 'delete'    -- Delete records
  | 'approve'   -- Approve workflow steps
  | 'export'    -- Export data (CSV, PDF)
  | 'admin'     -- Full admin access to module

const DEFAULT_PERMISSIONS: Permission[] = [
  'view', 'create', 'edit', 'delete', 'approve', 'export', 'admin'
]
```

### Scope Levels

```typescript
type Scope = 
  | 'all'        -- All records in company
  | 'own'        -- Only own records
  | 'department' -- Records in assigned department
  | 'subtree'    -- Department + sub-departments
```

### Permission Checking Logic

```typescript
async function checkPermission(
  userId: string,
  module: string,
  submodule: string,
  permission: Permission,
  resourceId?: string  -- For ownership checks
): Promise<boolean> {
  // 1. Get user roles
  const userRoles = await getUserActiveRoles(userId)
  
  // 2. Check each role
  for (const role of userRoles) {
    const hasPermission = await checkRolePermission(
      role, module, submodule, permission, resourceId
    )
    if (hasPermission) return true
  }
  
  return false
}
```

## Business Rules

1. **Code Uniqueness**: `kod` unique per company
2. **System Roles**: Some roles cannot be deleted (ADMIN, USER)
3. **Cascade Inactive**: Deactivating role deactivates all assignments
4. **Assignment Conflict**: One person cannot have same role twice in same scope
5. **Date Overlap**: Cannot have overlapping active assignments for same role

## Workflow Engine Integration

### Role-Based Approvals

Workflow steps can assign to:
- **Role**: "HR_MGR" → All users with HR_MGR role
- **Role + Scope**: "HR_MGR" + "department" → HR_MGR in requestor's department

### Approval Logic

```typescript
// When workflow step uses role approver
const approvers = await getPersonsWithRole(
  roleId: string,
  scope: 'company' | 'department' | 'tree',
  referenceDepartmentId?: string  -- For relative scope
)

// Then apply approval_logic: 'any' | 'all' | 'percentage'
```

## Module Structure

### Available Modules

```typescript
const MODULES = [
  { key: 'ik', label: 'İnsan Kaynakları', submodules: [
    { key: 'personel', label: 'Personel' },
    { key: 'birimler', label: 'Birimler' },
    { key: 'kadrolar', label: 'Kadrolar' },
    { key: 'roller', label: 'Roller' },
    { key: 'teskilat', label: 'Teşkilat Şeması' }
  ]},
  { key: 'muhasebe', label: 'Muhasebe', submodules: [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'islemler', label: 'İşlemler' },
    { key: 'hesaplar', label: 'Hesaplar' },
    { key: 'borclar', label: 'Borç Takip' },
    { key: 'projeler', label: 'Projeler' }
  ]},
  { key: 'sistem', label: 'Sistem', submodules: [
    { key: 'module-licenses', label: 'Modül Lisansları' },
    { key: 'roller', label: 'Rol Yönetimi' },
    { key: 'kullanicilar', label: 'Kullanıcılar' },
    { key: 'audit-log', label: 'Denetim Kayıtları' }
  ]}
]
```

## Related Pages

- **Kullanıcılar**: Assign roles to users
- **Personel**: View person's role assignments
- **Süreç Tanımları**: Use roles in workflow steps
- **Audit Log**: Track permission changes

## Implementation Checklist

- [ ] Create `app/app/sistem/roller/page.tsx` (or ik/roller)
- [ ] Create database tables: `roller`, `rol_izinler`, `personel_roller`
- [ ] Create `hooks/useRoller.ts`
- [ ] Create `components/modules/sistem/RolIzinMatrix.tsx`
- [ ] Create `lib/permissions.ts` for permission checking
- [ ] Add permission checks to existing pages
- [ ] Add to sidebar navigation
- [ ] Test workflow role resolution
