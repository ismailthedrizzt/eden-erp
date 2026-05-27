# Outbox Migration

Current role: TypeScript outbox services and dispatcher keep event queue behavior available during migration.

Target role: Python outbox domain and worker under `backend/app/domains/outbox/**` and `backend/app/workers/**`.

Temporary allowed use:
- Keep event enqueue and dispatcher behavior stable.
- Keep handlers as migration references.

Not allowed:
- Do not add new permanent external side-effect handling in Next.js routes.
- Do not dispatch external effects inside request mutation paths.

Priority: P1, after transaction boundary and P0 operations are moved.
