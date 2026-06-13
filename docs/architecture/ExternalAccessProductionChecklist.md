# External Access Production Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Amaç

Customer portal and external users must never gain internal ERP visibility.

## Checklist

- Portal users cannot call internal admin, audit, setup, integration credential or system APIs.
- Portal scope is limited to own customer/account/install base.
- Service requests are visible only for the owning customer scope.
- Shared documents require explicit share policy and tenant/customer scope.
- Internal notes, costs, margin, supplier and employee-only fields are never serialized to portal.
- Suspended portal user access is denied immediately.
- Portal access and document download are audited.
- Portal notifications target only the portal user/customer scope.

## P0 Blockerlar

- Portal user sees another customer's data.
- Portal user accesses internal admin/API.
- Shared document URL bypasses portal scope.
- Suspended portal account can still use API.

## Test Fixture

Create two portal customers in one tenant and verify cross-customer list/detail/document/download/service request attempts return 403/404.
