# Eden ERP Frontend Standard Contract

This contract turns the Eden ERP UI standards into code-level delivery rules.
It applies to live, development, preview, and internal pages. Development pages
are not exempt. `Temalarimiz` is not exempt.

## Standard Component Set

All new list, form, wizard, and lifecycle screens must use the canonical Eden
standard components from `components/ui/eden-standard.tsx`:

- `EdenPageShell`
- `EdenListPageShell`
- `EdenSmartList`
- `EdenFormShell`
- `EdenFormHeader`
- `EdenFormHero`
- `EdenHeroImageUploader`
- `EdenHeroDocumentUploader`
- `EdenFormTabs`
- `EdenFormActionBar`
- `EdenStatusActionButton`
- `EdenCompactFieldGrid`
- `EdenTokenTable`
- `EdenWizardShell`

## List Page Standard

List pages use this structure:

1. `EdenPageShell`
2. Page banner
3. `EdenListPageShell`
4. `EdenSmartList`

Smart List behavior:

- Search, filters, sorting, paging, density, and display mode belong inside the
  Smart List surface.
- Row actions must follow the module-specific action standard.
- New list pages must not create one-off table shells.

## Form Page Standard

Form pages use this structure:

1. `EdenFormShell`
2. `EdenFormHeader`
3. `EdenFormHero`
4. `EdenFormTabs`
5. `EdenFormActionBar`, when the form has submit/cancel actions outside the header

Custom hero/header/action implementations are not allowed for new pages.
Existing pages must migrate when touched.

## Form Header Standard

`EdenFormHeader` owns:

- Back button or breadcrumb
- Record title
- Status chips
- Context chips
- Standard form actions

Save/cancel placement:

- `Kaydet` can appear only in `EdenFormHeader` or `EdenFormActionBar`.
- Hero, tabs, lifecycle panels, upload cards, and summary cards must not contain
  separate save buttons.

## Hero Standard

`EdenFormHero` is a summary surface. It can contain:

- Record image/document uploaders
- Short record summary
- Key metadata
- A compact palette or preview summary when relevant

It must not contain long technical guidance, process-engine explanations, or
export/import actions. Those belong in tabs, tooltips, or documentation.

## Upload Standard

Image upload/download must use `EdenHeroImageUploader`.
Document upload/download must use `EdenHeroDocumentUploader`.

Rules:

- No left upload panel.
- No scattered upload/download buttons inside tabs.
- Slots are managed inside the hero uploader.
- Export/import generation can live in a tab, but generated files are tracked by
  the document uploader.

## Tabs Standard

Tabbed form details use `EdenFormTabs`.

Tabs should group editing surfaces by business meaning, not by implementation
detail. Wide token editors must use compact tables instead of large repeated
cards.

## Compact Field Grid Standard

Use `EdenCompactFieldGrid` for dense two-column record metadata and general
information forms.

Use `EdenTokenTable` for token/color/component-rule editing. Token editors must
be compact and scannable.

## Wizard Standard

Wizard and lifecycle flows use `EdenWizardShell`.

Wizard step state must not be implemented as loose page text. Validation,
payload, and action controls must follow the page/flow delivery contract.

## Status Action Standard

Until the process engine is active, theme/form status actions use the simple
status model:

- `Taslak`
- `Aktif`
- `Pasif`

Allowed transitions:

- `Taslak -> Aktif`
- `Aktif -> Pasif`

These transitions are performed only through `EdenStatusActionButton`.

The following buttons are not allowed until the process engine is implemented:

- `Incelemeye Gonder`
- `Onayla`
- `Arsivle`
- `Yeni Versiyon Olustur`

## Export / Import Standard

Export/import actions do not belong in Page Banner or Hero.

They belong in a dedicated `Export / Import` tab. Generated artifacts may be
listed or downloaded through the standard document uploader.

## Guard

The contract is enforced by:

```bash
npm run frontend:standard:check
```

The check is part of:

```bash
npm run eden:quality-gate
```

Existing audited debt can be printed with:

```bash
EDEN_FRONTEND_STANDARD_REPORT_DEBT=1 npm run frontend:standard:check
```

New strict pages must pass without errors.
