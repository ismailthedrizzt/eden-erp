# Theme Persistence Audit

Date: 2026-06-07

## Current Model

Canonical user preference storage:

- `public.user_workspace_state.ui_preferences`
- FastAPI: `GET/PATCH /api/v1/onboarding/preferences`
- Next BFF: `GET/PATCH /api/user/preferences`

Fields:

- `visualTheme`
- `appearanceMode`
- legacy `theme` mirrors `appearanceMode`

Accepted compatibility input:

- `visual_theme`
- `appearance_mode`
- old visual ids: `classicCurrent`, `executivePremium`, `anatolianModern`, `technicalCommand`

## Smoke Evidence

- `GET /api/user/preferences`: 200
- `PATCH /api/user/preferences` with `visualTheme=executive_premium`, `appearanceMode=dark`: 200
- Reset patch to `visualTheme=classic`, `appearanceMode=system`: 200

## Findings

| Severity | Finding | Status |
| --- | --- | --- |
| P1 | `/api/user/preferences` previously proxied to a missing FastAPI route. | Fixed. |
| P1 | Theme selection previously stayed in Design Lab localStorage only. | Fixed for app header and Design Lab. |
| P1 | DB preference must win over stale localStorage after login. | Implemented by app shell GET. |
| P2 | Workspace default theme does not exist. | Documented future work. |
| P2 | `theme` legacy name remains for compatibility. | Accepted until downstream code migrates to `appearanceMode`. |

## Decision

User-level persistence is field-test ready. Workspace default is not required for this sprint because user-level DB persistence exists.
