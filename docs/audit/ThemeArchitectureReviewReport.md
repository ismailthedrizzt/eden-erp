# Theme Architecture Review Report

Date: 2026-06-07

## Summary

The selectable visual theme system was promoted from a Design Lab-only state to a user preference architecture. Theme and appearance are now separate concepts.

## Inventory

Theme count: 4.

| Label | Canonical key | Legacy key |
| --- | --- | --- |
| Klasik | `classic` | `classicCurrent` |
| Art Deco Premium | `art_deco` | `executivePremium`, `executive_premium` |
| Anadolu Modern | `anatolian_60s` | `anatolianModern`, `anatolian_modern` |
| Yeşil Atölye | `command_bauhaus` | `technicalCommand`, `technical_command` |

Selector location: top-right profile dropdown. Theme and appearance are separate menu items; their option panels open to the left of the dropdown on desktop.

Appearance mode: separate profile-menu preference with `system`, `light` and `dark` options.

## Files Audited

- `components/design-lab/**`
- `components/layout/**`
- `app/app/design-lab/**`
- `app/app/layout.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `lib/user-state/**`
- `lib/user-preferences/**`
- `app/api/user/preferences/route.ts`
- `backend/app/api/v1/onboarding.py`
- `backend/app/domains/onboarding/**`
- `lib/release/routeReleaseRegistry.ts`
- `lib/navigation/navigationRegistry.ts`
- `components/onboarding/tourSteps.ts`
- `tailwind.config.ts`

Missing folders: `components/theme`, `components/app-shell`, `lib/theme`, `lib/preferences`.

## Architecture Findings

| Area | Result |
| --- | --- |
| Theme/appearance split | Implemented via `visualTheme` and `appearanceMode`. |
| Central theme config | Implemented in `themeConcepts.ts`. |
| DB persistence | Implemented through `user_workspace_state.ui_preferences`. |
| Cache | `localStorage` only; no theme cookie. |
| Legacy migration | Old Design Lab ids and `theme` appearance key are normalized. |
| Tenant default | Not implemented; documented as future P2. |
| Token strategy | Minimum `--eden-*` token set added; component migration remains. |
| Release language | Profile preference menu no longer shows Design Lab/concept/dev copy. |

## Risks

| Severity | Risk | Status |
| --- | --- | --- |
| P0 | Theme selector breaks auth/session. | Not observed; endpoint smoke passed. |
| P0 | Design Lab visible in release. | Guarded as `development_internal`; needs release smoke per environment. |
| P1 | Components ignore theme tokens because many hardcoded Tailwind colors remain. | Open debt. |
| P1 | Mobile header overflow from preference controls. | Mitigated by grouping controls under the compact profile menu. |
| P2 | Workspace default theme is absent. | Future admin preference. |
