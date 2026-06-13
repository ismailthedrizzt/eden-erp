# Audit Migration

Current role: TypeScript audit service records compliance trace events for the current app.

Target role: Python audit service under `backend/app/domains/audit/**`, with route access through FastAPI.

Temporary allowed use:
- Keep current audit writes best-effort while TS routes still mutate data.
- Keep masking and diff helpers as contract references.

Not allowed:
- Do not add new permanent audit core write logic in Next.js.
- Do not expose technical audit details directly to users.

Priority: P1.
