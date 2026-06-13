# Product Plan License Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->

Eden ERP uses tenant-based commercial access instead of separate development/release deployments.

## Concepts

- Product: a sellable platform product, currently `eden_erp`.
- Product plan: commercial package under the product.
- Plan module: module entitlement included in a plan.
- Plan feature: feature flag/limit entitlement included in a plan.
- Tenant license: a tenant's product, plan, status, dates, price and limits.
- Vendor tenant: EDEN Teknoloji platform/product owner tenant.
- Customer tenant: normal tenant using EDEN ERP by plan entitlement.

## Plans

- Development
- Mikro Isletme
- Kucuk Isletme
- Orta Isletme
- Buyuk Isletme
- Enterprise

Release registry is platform readiness. License entitlement is tenant access. They are evaluated together.

