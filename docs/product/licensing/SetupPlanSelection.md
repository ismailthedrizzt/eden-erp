# Setup Plan Selection

<!-- source-of-truth-standard: contract overrides markdown -->

The setup wizard now presents package cards:

- Mikro Isletme
- Kucuk Isletme
- Orta Isletme
- Buyuk Isletme
- Enterprise

Development is not shown to normal setup users. It is reserved for vendor/platform admin tenant creation.

Setup payload carries:

- legacy `scale` for backward compatibility
- new `plan_key` for tenant license creation

Permanent setup completion should create `tenant_licenses` after the migration is applied.

