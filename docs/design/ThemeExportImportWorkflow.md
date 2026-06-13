# Theme Export Import Workflow

<!-- source-of-truth-standard: contract overrides markdown -->

## Export

System themes can be exported from:

- `GET /api/theme/export?themeKey=classic&format=eden`
- `GET /api/theme/export?themeKey=classic&format=figma`
- `GET /api/theme/export?themeKey=classic&format=css`
- `GET /api/theme/export?themeKey=classic&format=readme`

Export is read-only and contains design tokens only.

## Designer Handoff

1. Export `eden-theme.json` and `figma-tokens.json`.
2. Share the designer brief and screenshot checklist.
3. Designer edits tokens only.
4. Designer returns `eden-theme.json` plus optional notes.

## Import

1. Admin/development user pastes or uploads JSON in `/app/sistem/temalar`.
2. `/api/theme/import` parses JSON.
3. Schema, security and contrast validation run.
4. Valid packages return a `preview` record.
5. Preview is stored locally for Design Lab inspection.
6. No imported theme becomes active in this phase.

## Future FastAPI Phase

Persistent import, activation, archive and tenant default assignment should move to FastAPI and PostgreSQL tables:

- `visual_themes`
- `tenant_visual_theme_settings`
- optional dedicated `user_visual_theme_preferences`, or existing `user_workspace_state.ui_preferences`

Activation must require platform admin permission and audit events.
