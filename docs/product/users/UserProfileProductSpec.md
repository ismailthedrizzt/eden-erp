# User Profile Product Spec

## Purpose

The user profile surface separates global login identity from tenant-scoped person identity.

## Profile Areas

- Login account: global user id, email/phone identity, authentication state.
- Tenant person profile: active tenant master person, display name, email, phone, role label, avatar.

## Current Route

- `/app/profil`

## Rules

- Header avatar and user menu read from the tenant-scoped profile resolver.
- Profile updates modify the active tenant master person/person record only.
- Profile photo upload must write to controlled Document/Media storage, not to a global user avatar field.
- If no photo exists, initials are generated from the active tenant master person display name.

