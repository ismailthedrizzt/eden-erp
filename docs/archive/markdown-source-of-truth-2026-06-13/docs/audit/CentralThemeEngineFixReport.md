# Central Theme Engine Fix Report

Date: 2026-06-08

## Summary

The theme engine was strengthened so theme changes affect the whole UI family, not only navbar/sidebar. The fix keeps existing user preferences compatible while adding canonical theme keys.

## 2026-06-08 Parametric CSS Follow-Up

The final global CSS layer now explicitly supports both canonical release keys and older internal concept ids:

- `art_deco_premium` and `art_deco`
- `green_atelier` and `command_bauhaus`

This prevents a mixed state where the sidebar receives the selected theme but PageBanner, SmartDataTable, buttons or legacy Tailwind utility surfaces remain in the default blue family. The enforcement layer is deliberately global and token-driven; it does not change the Eden logo and it does not add wizard-specific styling.

## Answers

- Is only the navbar changing now? No. Header, main background, page banner, smart lists, cards, inputs, badges, dashed empty states and motifs are covered by central tokens.
- Was the reported "green sidebar + blue application" issue addressed? Yes. Green Atelier now directly themes page banners, smart list toolbar/table, body/main background, core buttons and bordered card surfaces through both `green_atelier` and `command_bauhaus` selectors.
- Was the reported Pop Studio navbar mismatch addressed? Yes. Pop Studio now has a direct page banner, smart list and core button enforcement path so the shell and content share the same magenta/pop accent family.
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
