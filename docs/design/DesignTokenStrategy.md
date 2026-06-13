# Design Token Strategy

<!-- source-of-truth-standard: contract overrides markdown -->

## Current State

Eden ERP now has a central selectable theme config in `components/design-lab/themeConcepts.ts`. The config exports canonical visual theme ids, labels, compatibility aliases and root CSS variable helpers.

The minimum token set is available as root variables:

- `--eden-bg`
- `--eden-surface`
- `--eden-surface-muted`
- `--eden-surface-raised`
- `--eden-border`
- `--eden-border-strong`
- `--eden-text`
- `--eden-text-muted`
- `--eden-accent`
- `--eden-accent-soft`
- `--eden-success`
- `--eden-warning`
- `--eden-danger`
- `--eden-info`
- `--eden-radius-card`
- `--eden-shadow-card`

## Rule

Appearance controls the mode variant of the token family. Visual theme controls the token family. They must not share one state variable.

## Migration Direction

Current release components still contain many Tailwind color classes and hex literals. This sprint does not remove all of them. New and touched release-scope components should prefer semantic tokens or shared component variants where practical.

## Debt

The audit found approximately 3866 hardcoded color/class occurrences across `app`, `components` and `lib`. This is P1/P2 migration debt, not a release P0, because core pages continue to render with the existing Eden palette.
