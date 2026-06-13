# Temalarimiz Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

## Scope

Temalarimiz is the development-only Eden ERP theme management page. It turns the former visual theme/design lab workflow into a standard ERP management surface with PageBanner, list, detail tabs, draft lifecycle, import/export, token editing, validation and activation.

## Visibility

- Menu label: Temalarimiz.
- Route: `/app/development/temalarimiz`.
- Release status: `development_internal`.
- Required tenant model: Development plan / development tenant.
- Normal customer tenants do not see this menu.
- Direct route access is blocked by the tenant-aware release guard outside development tenants.
- Production customer UI only sees active themes in the profile theme selector.

## User Flow

1. Open Development > Temalarimiz.
2. Select `Ekle`.
3. Create a draft from a system theme or import JSON.
4. Edit general metadata, light/dark tokens, component tokens and motif settings.
5. Review preview and validation tabs.
6. Use `Kullanima Ac` to move a valid theme to active.
7. Active themes appear in the normal theme selector.

## Non-goals

- Eden logo editing is not supported.
- Layout/workflow editing is not supported.
- Arbitrary CSS/JS/HTML upload is not supported.
- Backend theme persistence is not completed in this MVP.
