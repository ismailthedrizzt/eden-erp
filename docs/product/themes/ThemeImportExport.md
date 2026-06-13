# Theme Import Export

<!-- source-of-truth-standard: contract overrides markdown -->

## Export Formats

- Eden native JSON
- Figma/Tokens Studio compatible JSON
- CSS variables
- README designer brief

Exports contain theme metadata and token values only. They must not contain secrets, user data, scripts or external assets.

## Import Rules

- Import accepts JSON token packages only.
- Import validates schema, token keys, safe values, forbidden strings and contrast.
- Imported themes are stored as preview/rejected, never active.
- Draft/preview themes can be updated by import.
- Active themes cannot be overwritten by import in the UI.

## Future Backend API

Preferred backend endpoints:

- `GET /api/v1/themes`
- `POST /api/v1/themes`
- `PATCH /api/v1/themes/{theme_id}`
- `POST /api/v1/themes/{theme_id}/validate`
- `POST /api/v1/themes/{theme_id}/activate`
- `POST /api/v1/themes/import`
- `GET /api/v1/themes/{theme_id}/export`
