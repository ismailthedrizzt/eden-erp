# Theme Release UX Audit

Date: 2026-06-07

## Release Visibility

Design Lab route:

- `/app/design-lab`
- release status: `development_internal`
- registry note: development-only visual identity exploration surface

This means release navigation/search/command surfaces should hide the route through release visibility guards.

## Profile Menu UX

| Requirement | Status |
| --- | --- |
| Theme selector lives in profile dropdown | Pass |
| Profile button remains compact | Pass |
| Theme selector not confused with light/dark | Pass |
| Profile aria says `Profil ve tercihleri ac` | Pass |
| Appearance mode is a separate menu item | Pass |
| Profile button does not show theme name | Pass |
| Nested option panels show names and selected state | Pass |
| Mobile header avoids overflow | Pass, preferences are grouped under profile |
| Release copy avoids Design Lab/concept/dev/internal | Pass in profile dropdown |

## Remaining Internal Copy

Internal copy remains inside:

- `components/design-lab/DesignLabShell.tsx`
- `app/app/design-lab/page.tsx`
- release registry notes
- navigation registry development route label

These are acceptable only if release visibility guard hides Design Lab surfaces. Re-run `release:check` and release-mode navigation/search smoke before promotion.

## Risks

| Severity | Risk | Status |
| --- | --- | --- |
| P0 | Design Lab visible in release. | Not observed by registry; requires release smoke. |
| P1 | Search/command palette leaks Design Lab label in release. | Guard should block; include in manual smoke. |
| P2 | Nested preference panels need mobile visual smoke on narrow devices. | Responsive fallback added; manual smoke required. |
