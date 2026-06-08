# Theme Component Coverage Guide

Date: 2026-06-08

When building or editing a shared component, bind these surfaces to tokens:

- container: `--eden-card-bg`, `--eden-card-border`, `--eden-shadow-card`
- text: `--eden-text`, `--eden-text-muted`, `--eden-text-soft`
- primary action: `--eden-accent`, `--eden-accent-hover`, `--eden-accent-text`
- fields: `--eden-input-bg`, `--eden-input-border`, `--eden-input-focus`
- tables: `--eden-table-header-bg`, `--eden-table-border`, `--eden-table-row-hover`
- status: `--eden-badge-*` and status border tokens
- decoration: `--eden-motif-*`, `--eden-corner-art-*`

Avoid adding new hardcoded blue/slate/gray defaults in shared/core components. If a Tailwind utility is unavoidable, confirm it is covered by the central bridge in `app/globals.css`.
