# Theme Preview And Approval Flow

## Current Phase

Imported themes are validated and returned as `preview` records. The admin page stores the last valid preview in browser local storage so Design Lab can inspect it without changing the user's real theme preference.

Current preview storage key:

- `eden.themeImportPreview`

## Preview Rules

- Preview does not write user preference.
- Preview does not change tenant default.
- Preview does not appear in normal user theme selector.
- Preview is visible only in internal/admin theme tooling and Design Lab.
- Critical contrast issues block activation.

## Activation Rules

Activation is intentionally not implemented in the first phase. Persistent activation should be a FastAPI mutation:

- `POST /api/v1/themes/import`
- `POST /api/v1/themes/{theme_id}/activate`
- `POST /api/v1/themes/{theme_id}/archive`

Only platform admin or `system.admin` equivalent users may activate imported themes.

## Default Resolution Model

1. User preference
2. Tenant default
3. System default
4. `classic` fallback
