# User Profile Avatar Implementation Report

Date: 2026-06-07

## Implemented

- Added canonical tenant-scoped profile resolver: `backend/app/domains/users/profile.py`.
- Added FastAPI users profile endpoints: `backend/app/api/v1/users.py`.
- Registered `/api/v1/users` in the API router.
- Updated `GET /api/v1/security/me` to use the new resolver for backward compatibility.
- Added Next BFF routes for `/api/users/me/profile` and `/api/users/me/avatar`.
- Added Next BFF route for `/api/users/me/avatar/content`.
- Updated the app shell to load `/api/users/me/profile` and pass resolver-provided initials into `UserAvatar`.
- Added `/app/profil` profile page with tenant-scoped master person profile view/edit.
- Added profile avatar upload/delete on `/app/profil`.
- Added `Profilim` entry to the profile dropdown.
- Added `/app/profil` to the release route registry.
- Fixed trusted proxy Unicode display name handling with `x-user-name-encoded`.

## Data Model Compatibility

The resolver supports both the target model and the current deployed schema:

- Preferred: `tenant_memberships.master_person_id`.
- Current fallback: `tenant_memberships.user_id` as tenant master person/person id.
- Preferred person table: `master_persons`.
- Current fallback table: `persons`.

## Avatar Behavior

- If a safe tenant-scoped photo URL exists, `avatarUrl` is returned.
- If a profile photo document id exists, nested `avatar.type = media` is returned with a media access route reference.
- If no photo exists, `avatar.type = initials` is returned.
- Header fallback initials now come from tenant master person display name instead of phone/email whenever possible.
- Avatar uploads accept only jpg, png, and webp content types up to 2 MB.
- Uploaded avatar bytes are written below private profile avatar storage and exposed through authenticated tenant-scoped content routes.
- Raw storage paths are stored only in `metadata_json.profileAvatar` and are not returned to the UI.

## Remote Verification

- `npm run typecheck`: pass.
- `npm run build`: pass with existing lint warnings.
- `npm run release:check`: pass.
- `npm run env:safety`: pass.
- `npm run db:target:check`: pass.
- `npm run boundaries:check`: pass with the existing `ActionGuideSearch.tsx` warning.
- Backend `ruff`, `mypy`, and `pytest app/tests`: pass, 232 tests.
- Remote profile probe for `5011005035`: profile 200, workspace count 2, display name `İsmail ILGAR`, initials `İI`.
- Avatar content without stored photo: 404 expected.
- Invalid `text/plain` avatar upload: 422 `AVATAR_TYPE_NOT_ALLOWED`.

## Deferred

- Avatar audit events should be connected to the canonical audit/event pipeline.
- Full Document Management attachment integration can replace the current private profile avatar storage metadata when that media contract is ready.
- Admin profile detail/edit screens can reuse the new `/api/v1/users/{user_id}/profile` endpoints.
