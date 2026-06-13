# Remote Development

Status: canonical AI context
Updated: 2026-06-13

Eden ERP canonical repository lives on the remote server. Local worktrees are temporary.

## Remote Repository

- SSH user: `edengrup-app1`
- Host: `45.155.19.162`
- Repo path: `/home/edengrup-app1/htdocs/app1.edengrup.com`
- Branch: `main`

Before changing code, verify the target with:

```bash
pwd
git branch --show-current
git status --short
```

## Safety Rules

- Do analysis against the remote canonical repo.
- Do not run data-loss commands.
- DB release target must be checked with `npm run db:target:check` before DB release work.
- Commit and push from the remote canonical repo when persistence is needed.
- Do not mark work complete until required guards pass.

## Related Contracts

- `contracts/core/release.contract.ts`
- `contracts/page-flow-contracts.json`

## Related Guards

- `scripts/check-database-target.js`
- `npm run validate:contracts`
- `npm run build`
