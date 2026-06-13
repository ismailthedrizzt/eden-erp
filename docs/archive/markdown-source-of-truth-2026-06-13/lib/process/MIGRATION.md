# Process Migration

Current role: TypeScript Process Engine manages existing process/task/approval MVP behavior.

Target role: Python process services and workers under `backend/app/domains/process/**` and `backend/app/workers/**`.

Temporary allowed use:
- Keep existing task and approval endpoints functional.
- Expose process state to the UI until FastAPI endpoints are ready.

Not allowed:
- Do not make TypeScript Process Engine the permanent workflow backend.
- Do not add domain mutations here; process coordinates, operation services mutate.

Priority: P1 after the P0 critical operations move.
