# Central Theme Engine Fix Report

Date: 2026-06-08

## Summary

The theme engine was strengthened so theme changes affect the whole UI family, not only navbar/sidebar. The fix keeps existing user preferences compatible while adding canonical theme keys.

## Answers

- Is only the navbar changing now? No. Header, main background, page banner, smart lists, cards, inputs, badges, dashed empty states and motifs are covered by central tokens.
- Which components are token-bound? App shell, Sidebar, Header, PageBanner, SmartDataTable, generic bordered cards, form controls, badges and decorative surfaces.
- Does every theme have light/dark tokens? Yes, existing theme definitions have both modes and now emit the expanded CSS variable contract.
- Are themes visually distinct? Yes: Classic neutral, Art Deco premium, Anadolu warm retro, Green Atelier botanical, Pop Studio graphic.
- Is PageBanner token-bound? Yes, through `--eden-page-banner-*`.
- Are Header and Sidebar same family? Yes, through `--eden-header-*` and `--eden-nav-*`.
- Are card/table/smart list token-bound? Yes, through `--eden-card-*`, `--eden-table-*` and `--eden-smart-list-*`.
- Are badge/status colors muted and theme-aware? Yes, the bridge maps common status classes to `--eden-badge-*`.
- Is motif/corner art theme-based? Yes, via `--eden-motif-*` and `--eden-corner-art-*`.
- What hardcoded areas remain? Some page-specific and SmartDataTable internal class maps still contain direct Tailwind colors, but release-critical surfaces are bridged.
- Is release safe? Theme selection does not bypass release guards; Design Lab visibility remains governed by release registry/navigation rules.

## Files Changed

- `components/design-lab/themeConcepts.ts`
- `app/globals.css`
- `app/app/layout.tsx`
- `lib/theme/themeRegistry.ts`
- `lib/theme/themeTokens.ts`

## Verification

Local typecheck could not run because this workspace has no local `tsc` binary installed. Run verification on the full server repo after syncing:

- `npm run typecheck`
- `npm run build`
- `npm run release:check`
- `npm run env:safety`
- `npm run db:target:check`
- `npm run boundaries:check`
