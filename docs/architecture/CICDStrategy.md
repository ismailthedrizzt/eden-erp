# CI/CD Strategy

GitHub Actions entrypoint:

```txt
.github/workflows/ci.yml
```

## Frontend Job

- `npm ci`
- `npm run encoding:guard`
- `npm run env:safety`
- `npm run typecheck`
- `npm run migration:status`
- `npm run smoke:test:dry`
- `npm run build`
- `git diff --check`

## Backend Job

- Install Python 3.12
- `pip install -e ".[dev]"`
- `python -m ruff check .`
- `python -m mypy app`
- `python -m pytest`

## OpenAPI Drift Job

- Run `npm run openapi:refresh`.
- Fail if `backend/openapi.json` or `lib/generated/backend-client/types.ts` changes.

## Docker Job

- `docker compose config`
- `docker build -f backend/Dockerfile backend`
- `docker build -f Dockerfile.next .`

## Security Checks

- `npm run env:safety` blocks tracked env files and public secret-looking env names.
- CI does not print secret values.
- Dependency audit can be added as non-blocking early phase.
