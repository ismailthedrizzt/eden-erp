# Theme Accessibility Audit

Date: 2026-06-07

## Scope

Audit is code and token based. Full visual browser automation was limited by local browser tooling instability; the component matrix should be repeated manually during field-test smoke.

## Theme Matrix

| Theme | Light | Dark | Notes |
| --- | --- | --- | --- |
| `classic` | Low risk | Low risk | Existing Eden baseline. |
| `executive_premium` | Low/medium | Medium | Premium muted palette; watch dark contrast on secondary text. |
| `anatolian_modern` | Medium | Medium | Warm surfaces can become low contrast if applied broadly. |
| `technical_command` | Medium | Low/medium | Strong dark mode; light mode needs smoke on tables/forms. |

## Component Findings

| Component | Issue | Severity | Recommendation |
| --- | --- | --- | --- |
| Header | New selector has icon-only button but includes aria-label and selected menu state. | Pass | Keep tooltip/aria text separate from appearance. |
| Sidebar | Still Eden navy/Tailwind driven, not fully tokenized. | P2 | Migrate active/hover colors to semantic tokens later. |
| Table row | Hardcoded gray/eden colors dominate. | P1 | Move table surface/text/border to token classes first. |
| Buttons | Primary/secondary still use Eden palette utilities. | P1 | Add shared button variants backed by `--eden-accent`. |
| Inputs/selects | Global disabled/read-only readability is guarded. | P2 | Add focus ring token mapping. |
| Status badges | Badge colors are mostly hardcoded. | P1 | Map success/warning/danger/info to semantic tokens. |
| Warning/error panel | Existing amber/red classes likely readable but not theme aware. | P2 | Tokenize alert panels. |
| Document slot | Needs visual smoke per theme. | P2 | Include in manual matrix. |
| Action Center item | Needs token migration for hover/status. | P2 | Include in manual matrix. |
| Wizard stepper | Color-only states should be checked. | P1 | Ensure icon/text accompanies color. |
| Audit timeline | Design Lab preview tokenized; production audit page uses hardcoded colors. | P2 | Tokenize after table/button pass. |
| Disabled/locked field | Global CSS preserves readable disabled text. | Pass | Keep this guard. |

## P0 Status

No P0 contrast issue was found in code review. Manual smoke is still required before release promotion.
