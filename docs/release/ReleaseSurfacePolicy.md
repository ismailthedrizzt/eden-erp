# Release Surface Policy

Develop ortaminda her sey denenebilir. Development ortaminda test edilebilir isler gorunur. Release ortaminda yalnizca onaylanmis, calisir ve kullaniciya anlatilabilir isler gorunur.

## Release Surface

Release normal users see only routes with `release` status.

Initial release candidates:

- `/login`
- `/offline`
- `/app`
- `/app/sirket/companies`
- `/app/sirket/companies/branches`
- `/app/sirket/companies/partners`
- `/app/sirket/companies/representatives`
- `/app/sirket/tesisler`
- `/app/sirket/teskilat`
- `/app/muhasebe/cari-kartlar`
- `/app/muhasebe/cari-hareketler`
- `/app/muhasebe/on-muhasebe-hareketleri`
- `/app/muhasebe/banka-hesaplari-ve-kartlari`
- `/app/muhasebe/banka-kart-hareketleri`
- `/app/muhasebe/hesap-ve-kart-hareketleri`
- `/app/ik/calisanlar`

## Findings

The registry and middleware now separate release visibility from module readiness and permission checks. Release visibility is the first gate.

## Risks

- A page can still be technically built but not promoted.
- Permission and tenant checks remain required after release visibility allows a route.

## Recommended Fixes

- Keep `release:check` in promotion checks.
- Add a manual release smoke for sidebar, command palette and direct URL attempts.

## P0/P1/P2 Priority

- P0: Sensitive development route visible in Release.
- P1: Route status not reviewed before promotion.
- P2: Better automated visual smoke coverage.

## Suggested Next Prompt

Build a small browser smoke that asserts Release sidebar contains only release routes.
