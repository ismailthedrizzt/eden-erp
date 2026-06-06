# Field Test Release Candidate Decision

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


## Decision Options
- `READY_FOR_RELEASE_CANDIDATE`
- `READY_WITH_LIMITATIONS`
- `FIX_BEFORE_RELEASE_CANDIDATE`
- `NOT_READY`

## READY_FOR_RELEASE_CANDIDATE
Expected behavior: no open P0, core flows passed or partially passed, release guard works, auth/DB/storage critical risk absent, no technical error is shown to the user.
Actual behavior: TBD
Result: TBD
Priority: TBD
Recommended fix: TBD

## READY_WITH_LIMITATIONS
Expected behavior: no P0, some P1 open, release scope can be narrowed safely.
Actual behavior: TBD
Result: TBD
Priority: TBD
Recommended fix: document exclusions in release notes.

## FIX_BEFORE_RELEASE_CANDIDATE
Expected behavior: no P0 but many P1 findings in core flows.
Actual behavior: TBD
Result: TBD
Priority: P1 cleanup batch required.
Recommended fix: complete cleanup plan before RC.

## NOT_READY
Expected behavior: any P0 means not ready.
Actual behavior: TBD
Result: TBD
Priority: P0.
Recommended fix: stop feature work; fix and retest blockers.

## Core Success Criteria
The first field test is successful only if these 20 flows are at least `ge?ti` or `k?smen ge?ti`: Login, ?irket tasla??, ?irket a??l???, Ortak kart?, ?lk ortakl?k giri?i, Temsilci kart?, Temsilcilik ba?latma, ?ube a??l???, ?ube bazl? yetki, ?al??an kart?, ??e giri?, Cari kart, Cari hareket, Sermaye art?r?m?, Pay devri, Belge y?kleme, Duplicate belge reuse, Action Center, Audit, Release Guard.

Any P0 in these flows blocks release-candidate preparation.
