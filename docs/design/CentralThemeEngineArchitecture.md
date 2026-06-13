# Central Theme Engine Architecture

<!-- source-of-truth-standard: contract overrides markdown -->

Canonical source is `components/design-lab/themeConcepts.ts`, re-exported through `lib/theme/themeRegistry.ts`. Theme is visual identity; appearance is light/dark/system. Components consume CSS variables. Adding a theme requires registry tokens, motif metadata and optional CSS motif variable definitions.
