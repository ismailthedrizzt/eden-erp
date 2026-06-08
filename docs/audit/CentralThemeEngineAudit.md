# Central Theme Engine Audit

Date: 2026-06-08

## Findings

The previous implementation had a partial token bridge, but several screens could still look like "green sidebar plus blue app" because:

- root first-render cache used `data-visual-theme` while most CSS bridge selectors only watched `data-eden-theme`
- canonical keys such as `green_atelier` and `art_deco_premium` were not normalized
- page banner, smart list, dashed empty states and header controls still had strong blue/slate fallback behavior
- the runtime token contract did not expose all requested table, badge, motif and interaction tokens

## Fix

- Added canonical registry facade: `lib/theme/themeRegistry.ts`.
- Added required token list: `lib/theme/themeTokens.ts`.
- Extended theme normalization for `art_deco_premium` and `green_atelier`.
- Expanded `getEdenThemeCssVars()` to emit page banner, smart list, badge, interaction and motif tokens.
- Added a central CSS coverage layer that supports both `data-eden-theme` and `data-visual-theme`.
- Standardized root theme metadata in `app/app/layout.tsx` with `data-eden-theme`, `data-eden-theme-internal`, `data-visual-theme`, `data-appearance`, and `data-appearance-mode`.

## Risk Levels

| Risk | Severity | Status |
| --- | --- | --- |
| Theme falls back to Classic when DB stores `green_atelier` | P1 | Fixed via alias normalization |
| Page banner remains blue/default under non-classic themes | P1 | Fixed via central banner tokens |
| Smart list/table surfaces keep slate/blue styling | P1 | Reduced via central CSS bridge |
| Some page-specific hardcoded status colors remain | P2 | Bridged globally, further component cleanup still useful |
| Full automated visual matrix is not in place | P2 | Manual smoke still required |
