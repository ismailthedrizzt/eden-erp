# Action Guide + Tour Known Gaps

## P1 / Pilot Hardening

- Full staging E2E is still needed with real tenant permissions, module readiness and ownership fixtures.
- Playwright is not installed in the repo; the E2E checklist is ready but the executable spec is not added.
- Action Guide intent resolver is still TS/Next UI-adjacent. FastAPI canonical eligibility is expanded, but full Python resolver migration remains P2.
- Setup page is usable in public-style layout; tour support is wired, but setup-specific visual verification should be done in staging.

## P2 / Product Growth

- Registry-constrained LLM refinement can improve explanation text and ambiguous matching, but must only choose from registry actions and must not change eligibility.
- Multi-language help content and localized action examples.
- Embedded video or richer help docs.
- User-specific learning mode based on completed tasks and dismissed hints.
- Admin-configurable tours and operation hints.
- Analytics on failed/low-confidence Action Guide queries.
- Voice input for Action Guide.
- Dedicated field helper dismissal analytics separate from locked field preference storage.
