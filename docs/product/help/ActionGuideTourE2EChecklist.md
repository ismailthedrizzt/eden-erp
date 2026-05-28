# Action Guide + Tour E2E Checklist

Playwright bu repoda kurulu degilse bu dosya manuel/regression checklist olarak kullanilir. Playwright eklendiginde ayni basliklar `tests/e2e/action-guide-tour.spec.ts` icine tasinmalidir.

## Seed Data

- Draft company
- Active company
- Active company with missing partners/current ownership readiness
- Partner with locked share ratio
- Representative without active authority
- Representative with active authority
- Active branch
- Closed branch
- Pending task and pending approval
- User without audit permission

## Global Tour

- First login opens global tour.
- Tour shows draft vs wizard distinction.
- Next/back/skip/complete buttons work.
- ESC postpones the tour.
- Completed state persists in backend preferences.
- "Yardimi Tekrar Goster" starts the tour again.

## Page Tours

- Companies page tour opens and can be dismissed.
- Partners page tour explains ownership/current ownership.
- Representatives page tour explains card status vs authority status.
- Branches page tour explains branch is not a company.
- Organization/facilities page tours explain boundary with branch.
- Setup page tour opens on setup readiness target.

## Action Guide

- Empty state shows examples, recent searches and tour actions.
- Enter submits query.
- Debounced query updates result.
- Low confidence query shows alternatives, not a fake action.
- "sube ac" on active company suggests Branch Opening wizard.
- "sube ac" on draft company blocks Branch Opening and suggests Company Opening.
- "sermaye artirimi neden kapali" shows partners/readiness reason and setup action.
- "pay orani neden degismiyor" suggests ownership action.
- "banka yetkisi ver" without authority suggests Representative Start.
- "banka yetkisi ver" with active authority suggests scope/limit change.
- "bekleyen islerimi goster" opens Action Center.
- "bu kaydi kim degistirdi" requires audit permission.
- Network/API error shows business-language error state.

## Field Helpers

- Company `address` helper points to Address Change.
- Company `committed_capital_amount` helper points to Capital Increase/Decrease and partners readiness.
- Partner `share_ratio` helper points to Initial Partnership Entry / Share Transfer / Capital Increase.
- Representative `scope_type` helper points to Authority Scope Change.
- Representative `transaction_limit` helper points to Limit Change.
- Branch `document_files` helper points to Branch Document Update.
- Disabled reason is visible when permission/module/status blocks the action.
- "Bu islem hakkinda bilgi al" opens Action Guide or help topic.

## Operation Hints

- Company create hint explains draft card vs Company Opening.
- Partner create hint explains rights are created by ownership operation.
- Representative create hint explains authority is separate.
- Branch empty hint points to active company Branch Opening.
- Setup incomplete hint points to Setup Center.

## Regression Gates

- `npm run typecheck`
- `npm run build`
- `npm run migration:status`
- `npm run boundaries:check`
- `npm run openapi:drift`
- `cd backend && ruff check .`
- `cd backend && mypy app`
- `cd backend && pytest`
