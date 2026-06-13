# Sistem - Kullanıcı Yönetimi Sayfası

<!-- source-of-truth-standard: contract overrides markdown -->

**Module**: Sistem (sistem)  
**Submodule**: Kullanıcılar (kullanicilar)  
**Path**: `app/app/sistem/kullanicilar/page.tsx`  
**Status**: ⏳ Not Implemented

## Purpose

System user management for authentication and authorization. Links auth.users (Supabase) with personel records and role assignments.

## Data Model

### Auth Integration

Uses Supabase Auth (`auth.users`) as primary user store.

### Extended User Data

```sql
CREATE TABLE kullanici_profil (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  
  -- Link to Personel (optional, for staff)
  personel_id UUID REFERENCES personel(id),
  
  -- Profile
  ad VARCHAR(100),
  soyad VARCHAR(100),
  telefon VARCHAR(20),
  dil_tercihi VARCHAR(10) DEFAULT 'tr',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  son_giris TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- View joining auth.users with profile
CREATE VIEW kullanici_detay AS
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.last_sign_in_at,
  kp.company_id,
  kp.personel_id,
  kp.ad,
  kp.soyad,
  kp.telefon,
  kp.is_active,
  p.ad as personel_ad,
  p.soyad as personel_soyad,
  p.fotograf_url
FROM auth.users au
LEFT JOIN kullanici_profil kp ON au.id = kp.id
LEFT JOIN personel p ON kp.personel_id = p.id;
```

### TypeScript Interface

```typescript
interface Kullanici {
  id: string
  email: string
  email_confirmed_at?: string
  last_sign_in_at?: string
  
  company_id?: string
  personel_id?: string
  
  ad?: string
  soyad?: string
  telefon?: string
  dil_tercihi: 'tr' | 'en'
  is_active: boolean
  
  -- Joined
  personel?: Personel
  roller?: Rol[]
  son_giris?: string
}
```

## UI Specifications

### Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ PageBanner: "Kullanıcı Yönetimi" [Yeni Kullanıcı Ekle]       │
├─────────────────────────────────────────────────────────────┤
│ [Filtre: Şirket ▼] [Ara: email/ad...] [Sadece Aktif ☑]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SmartDataTable                                          │ │
│ │                                                         │ │
│ │ Foto │ Ad Soyad        │ Email           │ Son Giriş │ Durum│
│ │──────┼─────────────────┼─────────────────┼───────────┼──────│
│ │ 👤   │ İsmail ILGAR    │ ismail@eden.com │ 2 dk önce │ 🟢  │
│ │ 👤   │ Canberk ...     │ can@eden.com    │ 1 saat    │ 🟢  │
│ │ 👤   │ Ergün ...       │ ergun@eden.com  │ 3 gün     │ 🟢  │
│ │ 👤   │ Ahmet Yeni      │ ahmet@test.com  │ Hiç       │ 🟡  │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Table Columns

| Key | Label | Type | Width | Notes |
|-----|-------|------|-------|-------|
| fotograf | Foto | image | 60 | From linked personel |
| ad_soyad | Ad Soyad | text | 200 | ad + soyad |
| email | Email | text | 250 | From auth.users |
| telefon | Telefon | text | 120 | - |
| personel_link | Personel | text | 150 | "Bağlı" / "Bağsız" |
| son_giris | Son Giriş | text | 150 | Relative time |
| email_confirmed | Onay | boolean | 100 | Email confirmed? |
| is_active | Durum | boolean | 100 | Badge |

## Form Specification

### Create User Flow

1. **Step 1**: Email + Password
2. **Step 2**: Link to Personel (optional)
3. **Step 3**: Assign Roles
4. **Step 4**: Send invitation email

### Form Fields

**Tab 1: Kimlik Bilgileri**
```typescript
{
  id: 'kimlik',
  label: 'Kimlik Bilgileri',
  fields: [
    {
      name: 'email',
      label: 'Email Adresi',
      type: 'email',
      required: true,
      placeholder: 'kullanici@company.com'
    },
    {
      name: 'ad',
      label: 'Ad',
      type: 'text',
      required: true
    },
    {
      name: 'soyad',
      label: 'Soyad',
      type: 'text',
      required: true
    },
    {
      name: 'telefon',
      label: 'Telefon',
      type: 'tel',
      required: false
    }
  ]
}
```

**Tab 2: Personel Bağlantısı**
```typescript
{
  id: 'personel',
  label: 'Personel Bağlantısı',
  fields: [
    {
      name: 'personel_id',
      label: 'Bağlı Personel Kaydı',
      type: 'select',
      required: false,
      options: [],  // Unlinked personel records
      placeholder: 'Bağlantı yok'
    }
  ]
}
```

**Tab 3: Rol Atamaları**
```typescript
{
  id: 'roller',
  label: 'Rol Atamaları',
  render: () => <KullaniciRolAtama userId={id} />
}
```

**Tab 4: Güvenlik (View Only for admins)**
```typescript
{
  id: 'guvenlik',
  label: 'Güvenlik',
  fields: [
    {
      name: 'email_confirmed',
      label: 'Email Onaylı',
      type: 'display',
      render: (value) => value ? '✓ Onaylı' : '✗ Onay bekliyor'
    },
    {
      name: 'son_giris',
      label: 'Son Giriş',
      type: 'display'
    },
    {
      name: 'is_active',
      label: 'Hesap Aktif',
      type: 'select',
      options: [
        { value: 'true', label: 'Aktif' },
        { value: 'false', label: 'Pasif (Giriş yapamaz)' }
      ]
    }
  ]
}
```

## Special Actions

### 1. Reset Password
- Send password reset email via Supabase
- Button: "Şifre Sıfırla Emaili Gönder"

### 2. Resend Confirmation
- For unconfirmed emails
- Button: "Onay Emailini Yeniden Gönder"

### 3. Impersonate
- Admin can login as user (for debugging)
- Button: "Kullanıcı Olarak Giriş Yap"
- Security: Log all impersonations

### 4. Force Logout
- Invalidate all sessions
- Button: "Tüm Oturumları Sonlandır"

## User Invitation Flow

```typescript
async function inviteUser(email: string, roleIds: string[]) {
  // 1. Create user in auth.users (disabled until accept)
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`
  })
  
  if (error) throw error
  
  // 2. Create profile record
  await supabase.from('kullanici_profil').insert({
    id: data.user.id,
    company_id: currentCompanyId,
    is_active: true
  })
  
  // 3. Assign roles
  for (const roleId of roleIds) {
    await assignRole(data.user.id, roleId)
  }
  
  // 4. Send notification to admin
  await sendNotification('user_invited', { email, invited_by: currentUserId })
}
```

## Business Rules

1. **Email Uniqueness**: One auth.users record per email
2. **Personel Link**: One personel can have max 1 active user
3. **Self-Protection**: Cannot delete own account
4. **Admin Protection**: At least one ADMIN must remain
5. **Cascade Roles**: Deleting user removes all role assignments
6. **Soft Delete**: Mark inactive instead of hard delete

## Related Pages

- **Roller**: View role assignments
- **Personel**: View user's personel record
- **Audit Log**: Track user actions
- **Profil**: User's own profile page

## Implementation Checklist

- [ ] Create `app/app/sistem/kullanicilar/page.tsx`
- [ ] Create `hooks/useKullanicilar.ts`
- [ ] Create database tables and triggers
- [ ] Implement Supabase Auth admin functions
- [ ] Add email templates (invitation, reset)
- [ ] Add to sidebar navigation
- [ ] Test invitation flow
- [ ] Test role assignments
