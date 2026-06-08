# Theme Transition Consistency Report

Date: 2026-06-08

## Matrix

| Theme | Light identity | Dark identity | Result |
| --- | --- | --- | --- |
| Classic | neutral SaaS baseline | slate baseline | Safe |
| Art Deco Premium | ivory, graphite, gold geometry | night navy, gold linework | Distinct |
| Anadolu 60'lar | cream, terracotta, petrol | warm petrol, copper contour | Distinct |
| Green Atelier | paper, forest green, botanical | charcoal forest, sage contour | Distinct |
| Pop Studio | cream, magenta, graphic accents | ink, magenta, warm contrast | Distinct |

## Consistency Checks

- Theme and appearance are separate state values.
- `data-visual-theme` and `data-eden-theme` both receive coverage.
- Theme aliases do not cause fallback to Classic.
- Page banner and smart list no longer remain default blue when the selected theme is Green Atelier or Pop Studio.
- Dark mode receives theme-specific surfaces instead of only a generic navy shell.

## Manual Smoke Required

Run the five themes in light and dark on `/app`, `/app/sirket/companies`, a form page, a wizard, a document slot and Action Center before field test.
