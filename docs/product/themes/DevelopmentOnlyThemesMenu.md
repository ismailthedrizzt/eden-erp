# Development Only Themes Menu

<!-- source-of-truth-standard: contract overrides markdown -->

## Menu

- Group: Development
- Label: Temalarimiz
- Route: `/app/development/temalarimiz`

## Visibility Rule

The menu is development-tenant only. Normal tenants do not see the Development group because the only child route is `development_internal` and tenant entitlements are evaluated by the release visibility guard.

## Release Behavior

- Release/customer tenants cannot see the menu.
- Release/customer tenants cannot directly open the route.
- Normal users can only select active themes through the profile theme selector.
- Draft, preview, rejected, archived and inactive themes are hidden from normal theme selection.

## Legacy Route

`/app/sistem/temalar` is deprecated and hidden from navigation/search/command palette. The canonical page is `/app/development/temalarimiz`.
