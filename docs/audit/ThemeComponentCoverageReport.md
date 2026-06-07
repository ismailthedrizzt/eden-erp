# Theme Component Coverage Report

Date: 2026-06-07

## Coverage Method

This pass used code inspection, endpoint smoke and targeted build checks. Browser automation was unstable in this environment, so full visual screenshots should be repeated manually.

## Core Pages

| Area | Status | Notes |
| --- | --- | --- |
| Login | Not visually smoke tested | Root first-render script updated for appearance/theme cache. |
| `/app` | Code path updated | Header selector is global. |
| Sirketler | Needs visual smoke | Table preference data already persisted in same store. |
| Ortaklar | Needs visual smoke | Hardcoded color debt remains. |
| Temsilciler | Needs visual smoke | Hardcoded color debt remains. |
| Subeler | Needs visual smoke | Hardcoded color debt remains. |
| Calisanlar | Needs visual smoke | Wizard/locked field checks required. |
| Cari Kartlar | Needs visual smoke | Table/button token debt. |
| Cari Hareketler | Needs visual smoke | Table/status token debt. |
| Belgeler | Needs visual smoke | Document slot audit required. |
| Action Center | Needs visual smoke | Status/hover token debt. |
| Audit | Needs visual smoke | Timeline/table token debt. |

## Development Pages

| Area | Status | Notes |
| --- | --- | --- |
| Design Lab | Updated | Writes `visualTheme` preference, still development/internal copy. |
| Sozlesmeler | Needs visual smoke | Development route. |
| CRM | Needs visual smoke | Development route. |
| Satis Sonrasi | Needs visual smoke | Development route. |

## Smoke Matrix

Minimum matrix for manual verification:

| Theme | Light | Dark |
| --- | --- | --- |
| `classic` | Required | Required |
| `executive_premium` | Required | Required |
| `anatolian_modern` | Required | Required |
| `technical_command` | Required | Required |

Check header, sidebar, card, table, form, wizard, badge and error state in each combination.
