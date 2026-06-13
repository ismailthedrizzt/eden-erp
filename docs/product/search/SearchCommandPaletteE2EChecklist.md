# Search / Command Palette E2E Checklist

<!-- source-of-truth-standard: contract overrides markdown -->

## Seed

- Active company
- Branch
- Partner
- Representative
- Project task
- Document
- Cari account
- Installed asset
- Service request
- Audit log with request_id
- User with restricted company/branch scope

## Tests

- Ctrl+K opens command palette.
- Header search trigger opens command palette.
- ESC closes palette.
- Arrow down/up changes active result.
- Enter opens selected result.
- Company search returns authorized company.
- VKN search returns company/cari/stakeholder only when authorized.
- Branch search returns Ankara branch.
- Task issue key search returns task.
- Document title/file name search returns document metadata.
- Serial number search returns installed asset.
- Action search returns action result.
- Disabled action shows reason.
- Recent item appears after opening a result.
- Mobile viewport uses full-screen palette.
- Unauthorized result is hidden.
- Audit result is hidden without audit permission.
- Backend unavailable state shows controlled error, not technical trace.

## Optional Playwright File

`tests/e2e/search-command-palette.spec.ts`

If Playwright is enabled, cover keyboard navigation and mobile viewport separately.
