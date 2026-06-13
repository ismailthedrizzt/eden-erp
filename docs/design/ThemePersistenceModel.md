# Theme Persistence Model

<!-- source-of-truth-standard: contract overrides markdown -->

## Preference Priority

1. Authenticated user preference in DB.
2. Workspace/tenant default theme, future.
3. `localStorage` cache for first render and hydration.
4. System/default fallback.

## Current Implementation

Canonical storage:

- Table: `public.user_workspace_state`
- Column: `ui_preferences jsonb`
- FastAPI GET/PATCH: `/api/v1/onboarding/preferences`
- Next BFF: `/api/user/preferences`

Canonical fields:

```json
{
  "visualTheme": "executive_premium",
  "appearanceMode": "dark"
}
```

Compatibility fields:

- `theme` remains as a legacy alias for `appearanceMode`.
- `visual_theme` and `appearance_mode` are accepted by FastAPI.
- Legacy visual theme ids are normalized to canonical keys.

## Cache Rules

`localStorage` may speed up first render. It is not authoritative after login. App shell fetches `/api/user/preferences`; server value refreshes the cache and wins.

## Workspace Default

Workspace default theme is not implemented yet. Future model:

- user selected theme overrides workspace default
- workspace default overrides `classic`
- admin UI may manage workspace default later

This is P2 while user-level DB persistence exists.
