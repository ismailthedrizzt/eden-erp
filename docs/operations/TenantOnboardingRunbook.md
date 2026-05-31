# Tenant Onboarding Runbook

## Amac

Yeni tenant'i production'a guvenli sekilde almak.

## Kim Kullanir

Customer success, operations, tenant admin, engineering when needed.

## On Kosullar

- Tenant contract, domain, admin user and modules agreed.
- Data retention and backup expectations documented.
- Initial company scope model defined.
- Support contact and incident contact known.

## Adimlar

1. Create tenant/workspace.
2. Configure auth, admin user and roles.
3. Activate required modules.
4. Configure company scope and branch scope.
5. Configure document storage prefix and retention defaults.
6. Configure integrations/webhooks only after secrets owner is present.
7. Run readiness check.
8. Run smoke: login, dashboard, company list, document upload/download, audit.
9. Hand over admin console and support guide.

## Kontrol Listesi

- Tenant id recorded.
- Admin roles least-privilege reviewed.
- No demo/test data visible.
- Portal users isolated from internal users.
- Backup/restore coverage includes tenant data and documents.

## Rollback/Fallback

- Suspend tenant activation if readiness fails.
- Disable modules by feature flag/module activation.
- Revoke onboarding secrets if handover fails.

## Audit/Log Referanslari

- Tenant creation audit.
- Module activation audit.
- User/role audit.
- Integration credential audit.
