# Operations Migration

Current role: TypeScript operation orchestrators keep the existing ERP flows alive during the FastAPI migration.

Target role: Python FastAPI operation services and domain services under `backend/app/domains/**` and `backend/app/services/**`.

Temporary allowed use:
- Keep current routes and wizards working.
- Add only small adapter fixes needed for migration safety.

Not allowed:
- Do not add new permanent operation core logic here.
- Do not introduce new cross-domain mutation chains in TypeScript.

Priority: P0 for branch opening/closing, company official changes, capital increase, representative authority and ownership transactions.
