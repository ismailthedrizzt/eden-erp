# Frontend Standard Contract Audit

Date: 2026-06-11

Scope:

- Temalarimiz
- Calisanlarimiz
- Sirketlerimiz
- Ortaklarimiz
- Temsilcilerimiz
- Subelerimiz
- Muhasebe development pages
- Proje/Gorev pages
- Urun/Hizmet pages
- Satis sonrasi pages
- CRM pages

Guard:

- `scripts/check-frontend-standard-contracts.js`
- `npm run frontend:standard:check`
- included in `npm run eden:quality-gate`

## Enforced Routes

| Route | Page file | Expected shell | Actual shell | Hero standard | Uploader standard | Save placement | Status action standard | Tabs standard | Deviation | Risk | Required fix |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/app/development/temalarimiz` | `app/app/development/temalarimiz/page.tsx` | `EdenListPageShell`, `EdenSmartList`, `EdenFormShell`, `EdenFormHeader`, `EdenFormHero`, `EdenFormTabs` | Standard components applied | Hero uses `EdenFormHero` | Image/document slots use hero uploaders | `Kaydet` is in form header | `EdenStatusActionButton` | `EdenFormTabs` | None | Low | None |
| `/app/ik/calisanlar` | `app/app/ik/calisanlar/page.tsx` | `EdenPageShell`, `EdenListPageShell`, `EdenSmartList`, `EdenFormShell`, `EdenFormHeader`, `EdenFormHero`, `EdenFormTabs`, `EdenWizardShell` | Standard components applied | Detail summary uses `EdenFormHero` | No scattered image/document uploader introduced | Modal submit actions use `EdenFormActionBar` | No loose status action added | `EdenFormTabs` | None | Low | None |

## Audited Existing Surface

These pages are tracked as legacy or pre-standard surfaces. They are scanned by
the guard and can be printed with `EDEN_FRONTEND_STANDARD_REPORT_DEBT=1`, but
they do not block the gate until they enter the strict migration set.

| Route | Expected shell | Actual shell | Deviation | Risk | Required fix |
| --- | --- | --- | --- | --- | --- |
| `/app/sirket/companies` | List/Form/Wizard standard | Legacy mixed shell | list, form, wizard shells | Medium | Migrate when next touched |
| `/app/sirket/companies/branches` | List/Form/Wizard standard | Legacy mixed shell | list, form, wizard shells | Medium | Migrate when next touched |
| `/app/sirket/companies/partners` | List/Form/Wizard standard | Legacy mixed shell | list, form, wizard shells | Medium | Migrate when next touched |
| `/app/sirket/companies/representatives` | List/Form/Wizard standard | Legacy mixed shell | list, form, wizard shells | Medium | Migrate when next touched |
| `/app/sirket/companies/stakeholders` | List/Form standard | Legacy mixed shell | list and form shells | Medium | Migrate when next touched |
| `/app/muhasebe/**` | List/Form standard | Development debt baseline | standard shell adoption pending | Medium | Migrate before release scope expansion |
| `/app/gorev-ve-proje-yonetimi/**` | List/Form/Wizard standard | Development debt baseline | standard shell adoption pending | Medium | Migrate before release scope expansion |
| `/app/urun-ve-hizmetler/**` | List/Form standard | Development debt baseline | standard shell adoption pending | Medium | Migrate before release scope expansion |
| `/app/satis-sonrasi/**` | List/Form/Wizard standard | Development debt baseline | standard shell adoption pending | Medium | Migrate before release scope expansion |
| `/app/crm/**` | List/Form standard | Development debt baseline | standard shell adoption pending | Medium | Migrate before release scope expansion |

## Guard Rules

The guard fails when a strict route:

- has list signals without `EdenListPageShell` and `EdenSmartList`
- has form signals without `EdenFormShell`, `EdenFormHeader`, and `EdenFormHero`
- has tab state without `EdenFormTabs`
- has wizard signals without `EdenWizardShell`
- places `Kaydet` outside `EdenFormHeader` or `EdenFormActionBar`
- uses raw `ImageSlotUploader` or `DocumentSlotUploader` instead of hero uploaders
- exposes upload/download actions outside hero uploaders
- exposes lifecycle/status actions outside `EdenStatusActionButton`

## Result

Strict route result:

- `Temalarimiz`: pass
- `Calisanlarimiz`: pass

Blocking frontend standard issues:

- None
