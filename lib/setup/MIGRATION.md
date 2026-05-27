# Setup Readiness Migration

Current role: TypeScript setup readiness checker maps module infrastructure issues to user-facing setup status.

Target role: Python setup/readiness service under `backend/app/services/**` or a dedicated setup domain.

Temporary allowed use:
- Keep session bootstrap and module unavailable states working.
- Keep readiness definitions as contract references.

Not allowed:
- Do not make Next.js route handlers the permanent module readiness backend.
- Do not expose table/RPC/migration errors directly to users.

Priority: P2 after core operation and platform service migration.
