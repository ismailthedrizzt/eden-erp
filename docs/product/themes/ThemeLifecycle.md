# Theme Lifecycle

<!-- source-of-truth-standard: contract overrides markdown -->

## States

- `draft`: Created by `Ekle`; not visible to normal users.
- `preview`: Imported and validation-ready; not visible to normal users.
- `active`: Passed validation and is available in the theme selector.
- `inactive`: No longer offered as a normal selectable theme.
- `archived`: Retained for history; cannot be selected.
- `rejected`: Import or validation failed.

## Rules

- New themes start as `draft`.
- Imported themes start as `preview` or `rejected`; import never activates automatically.
- `Kullanima Ac` runs validation and blocks critical failures.
- System themes cannot be deleted, deactivated or archived.
- Active themes cannot be deleted.
- Active themes can be applied as a user preference; appearance remains a separate light/dark/system preference.

## Persistence

Current implementation stores managed custom themes in browser-local storage as an MVP. Backend persistence in `visual_themes` with audit events remains P1 before field rollout across devices and users.
