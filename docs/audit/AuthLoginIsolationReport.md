# Auth Login Isolation Report

Date: 2026-06-09

## Scope

This report covers the public authentication entry experience at `/login`.

Included:

- Login tab
- Signup tab
- OTP verification
- Company join request form
- Public auth visual shell

Excluded:

- App shell
- Sidebar/header
- In-app visual theme engine
- Temalarımız
- Tenant module screens

## Implementation Summary

The login screen now renders through a dedicated auth root class:

- `eden-auth-root`
- `components/auth/LoginExperience.module.css`

The auth screen defines its own token namespace:

- `--auth-bg`
- `--auth-surface`
- `--auth-border`
- `--auth-text`
- `--auth-primary`
- `--auth-cyan`
- `--auth-blue`
- `--auth-amber`
- `--auth-purple`
- `--auth-grid`
- `--auth-glow`

The public auth UI does not depend on:

- `data-eden-theme`
- `data-appearance`
- `--eden-*`
- Design Lab
- Temalarımız theme tokens
- App shell theme selector state

## Files Changed

- `components/auth/LoginExperience.tsx`
- `components/auth/LoginExperience.module.css`

## Auth Logic

Auth logic was preserved. The existing handlers and API calls remain in place:

- `/api/auth/tenant-status`
- `/api/auth/otp/send`
- `/api/auth/otp`
- `/api/auth/company-join`
- OTP resend timer
- tenant id storage after OTP login
- signup setup redirect
- `/app` redirect after successful login

The UI now uses a form submit for the first step so Enter continues to work consistently.

## Brand Asset

The Eden logo path is unchanged:

- `/brand/eden-logo-colored.png`

No recolor, filter, crop, replacement, or generated logo asset was introduced.

## Isolation Result

Expected result:

- Changing app visual theme does not change the login page.
- Changing app appearance mode does not change the login page.
- Theme-specific app classes and `--eden-*` values do not drive auth colors.
- Public auth screens do not render app shell/sidebar/header/theme selector.

## Residual Risk

Low: the component keeps a non-default legacy fallback branch for emergency comparison, but the normal `/login` route renders the new isolated high-tech shell.
