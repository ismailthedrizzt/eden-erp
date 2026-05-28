# Representative Authority Known Gaps

## P1 - Before First Customer

- Run staging E2E with `FASTAPI_BASE_URL` for representative card CRUD and authority transactions.
- Remove temporary Next route fallbacks after staging verification.
- Add production-like tests for branch/organization/facility scope denial.
- Verify current authority projection with high-volume representative data.
- Align duplicate representative card detection with final master identity model.
- Add backend tests for suspend/resume/terminate scope and limit edge cases where gaps remain.

## P2 - After Pilot

- Advanced joint-signature combinations and approval matrix.
- Bank integration for real bank authority validation.
- GIB/SGK real authority integration and status sync.
- Authority document OCR/validation.
- Multi-currency limit policy.
- More granular authority templates by company type and sector.
- Branch detail representative-authority UI refinement.

## P3 - Later Product Depth

- Authority simulation and impact preview across accounting, HR and procurement modules.
- Advanced delegated authority chains.
- Authority expiry notification automation.
- Representative authority analytics dashboard.
