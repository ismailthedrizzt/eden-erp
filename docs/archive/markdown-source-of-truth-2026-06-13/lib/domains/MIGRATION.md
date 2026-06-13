# Domain Services Migration

Current role: TypeScript domain services document and stabilize domain boundaries during the backend split.

Target role: Python domain services under `backend/app/domains/**`.

Temporary allowed use:
- Keep current orchestrators and routes working.
- Use TypeScript services as executable migration notes where already wired.

Not allowed:
- Do not grow TypeScript domain services as the permanent backend.
- Do not write another domain's owned data directly; use a domain service or orchestrator path.

Priority: P0 for branches, organization, facilities, representatives and ownership helpers used by critical operations.
