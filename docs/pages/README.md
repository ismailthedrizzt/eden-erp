# Eden ERP - Page Documentation Index

<!-- source-of-truth-standard: contract overrides markdown -->

This directory contains detailed specifications for all application pages.

## Implemented Pages

| Page | Path | Status | Module | Description |
|------|------|--------|--------|-------------|
| Home/Dashboard | `/app` | ✅ | Genel | User dashboard with widgets |
| Personel List | `/app/ik/personel` | ✅ | İK | Staff management with SmartDataTable |
| Personel Detail | `/app/ik/personel/[id]` | ✅ | İK | Single personel view/edit |
| Muhasebe Dashboard | `/app/muhasebe/dashboard` | ✅ | Muhasebe | Financial overview |
| Borç Takip | `/app/muhasebe/borclar` | ✅ | Muhasebe | Debt tracking |
| Hesaplar | `/app/muhasebe/hesaplar` | ✅ | Muhasebe | Account transactions |
| Tüm İşlemler | `/app/muhasebe/islemler` | ✅ | Muhasebe | All transactions list |
| Proje Özeti | `/app/muhasebe/projeler` | ✅ | Muhasebe | Project summary |
| Teşkilat Şeması | `/app/ik/teskilat` | ✅ (Basic) | İK | Organization chart (placeholder) |
| Modül Lisansları | `/app/sistem/module-licenses` | ✅ | Sistem | Module activation |

## Planned Pages

### İK Module

| Page | Path | Status | Doc File | Priority |
|------|------|--------|----------|----------|
| Birimler | `/app/ik/birimler` | ⏳ | [ik-birimler.md](./ik-birimler.md) | 🔴 High |
| Kadrolar | `/app/ik/kadrolar` | ⏳ | [ik-kadrolar.md](./ik-kadrolar.md) | 🔴 High |
| Roller | `/app/ik/roller` or `/app/sistem/roller` | ⏳ | [ik-roller.md](./ik-roller.md) | 🔴 High |

### Sistem Module

| Page | Path | Status | Doc File | Priority |
|------|------|--------|----------|----------|
| Kullanıcılar | `/app/sistem/kullanicilar` | ⏳ | [sistem-kullanicilar.md](./sistem-kullanicilar.md) | 🟡 Medium |
| Ayarlar | `/app/sistem/ayarlar` | ⏳ | [sistem-ayarlar.md](./sistem-ayarlar.md) | 🟡 Medium |
| Denetim Kayıtları | `/app/sistem/audit-log` | ⏳ | - | 🟢 Low |

### Profile

| Page | Path | Status | Doc File | Priority |
|------|------|--------|----------|----------|
| Profilim | `/app/profil` | ⏳ | - | 🟡 Medium |
| Bildirimler | `/app/bildirimler` | ⏳ | - | 🟡 Medium |

## Documentation Structure

Each page document includes:

1. **Purpose** - What the page does
2. **Data Model** - Database schema and TypeScript interfaces
3. **UI Specifications** - Layout, components, columns
4. **Form Fields** - All form tabs and fields
5. **Business Rules** - Validation and constraints
6. **Related Pages** - Connected features
7. **Implementation Checklist** - Development tasks

## Creating New Page Docs

**Command**: `/document_page [page-path]`

**AI Action**:
1. Create new MD file in `docs/pages/`
2. Follow template structure
3. Include all required sections
4. Update this index
5. Commit with message: `docs: Add page spec - [Page Name]`

---

**Last Updated**: 2024-05-01
