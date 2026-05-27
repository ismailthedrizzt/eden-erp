# Read Models Migration

Current role: TypeScript read-model helpers and projection registry support current list/detail responses.

Target role: Python projection/read-model services or database views exposed through FastAPI.

Temporary allowed use:
- Keep current UI pages reading stable shapes.
- Keep registry keys as shared contract until generated contracts replace them.

Not allowed:
- Do not add duplicate projection keys or long-lived compatibility aliases.
- Do not hide missing infrastructure errors as successful reads.

Priority: P2, except branch/company/ownership read models needed by P0 operations.
