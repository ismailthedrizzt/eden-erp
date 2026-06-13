# Core Domain Principles

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06

## Canonical Principles

- Kart baska, islem baska: master/card data is not the same as lifecycle mutation.
- `Ekle` creates draft state; official activation/completion happens through an operation.
- Official, legal and financial changes must use wizard/operation flows.
- Critical operation state changes must be audited.
- Action Center is a business work center, not a technical event log.
- Release surface is controlled by product readiness, not by whether a route builds.

## Current Audit Status

The 2026-06-06 remote server/local DB audit found these principles directionally present but not yet universally enforced across all modules.
