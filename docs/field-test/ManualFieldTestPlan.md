# Manual Field Test Plan

<!-- source-of-truth-standard: contract overrides markdown -->

Date: 2026-06-06
Environment: Remote server + local PostgreSQL/local DB; FastAPI canonical backend; Next.js UI/BFF/proxy; local document storage; release registry enabled.
Test user / role: Manual field tester: business user / admin-capable tester unless scenario says otherwise.

Standard finding fields: tested module, expected behavior, actual behavior, result, priority, recommended fix.


## Purpose
This plan moves Eden ERP from technical build checks to business field validation. The tester performs real business workflows and records whether the ERP behaves correctly for workflow, UX, data integrity, security and architecture principles.

## Test Method
- Tester executes scenarios manually in the remote server environment.
- Codex does not automate the field test in this phase.
- Every issue is entered in `ManualFieldTestFindingsRegister.md`.
- P0 findings stop release-candidate preparation until fixed and retested.
- P1 findings may allow continued test execution but must be reviewed before release-candidate decision.
- P2 findings are polish or documentation items.

## Core Modules Under Test
Login, Ana Sayfa, ?irketlerimiz, Ortaklar?m?z, Temsilcilerimiz, ?ubelerimiz, Te?kilat/Kadro, Tesisler/Lokasyonlar, ?al??anlar, Cari Kartlar, Cari Hareketler, Belgeler, Action Center, Audit and Release Guard.

## Expected Behavior
- `Ekle` creates draft records.
- Official/legal/financial change happens via lifecycle operation or wizard.
- Documents are uploaded in context and centrally managed.
- FastAPI owns business mutation and DB transaction boundaries.
- Release registry hides development-only surfaces in release.

## Actual Behavior
To be filled during manual testing.

## Result / Priority / Recommended Fix
Use the findings register for each observed result.
