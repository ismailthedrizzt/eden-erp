# P0/P1/P2 Risk Register

## Findings

| id | title | module | severity | impact | file/path | recommended fix | suggested next prompt |
|---|---|---|---|---|---|---|---|
| P0-ENV-001 | Release Supabase mutation risk | env/db | P0 | Release data can be changed by development migration/seed | `scripts/check-supabase-target.js` | Keep guard required before migration/seed/import commands | Add CI gate for Supabase target check |
| P0-ENV-002 | Release login bypass risk | auth | P0 | Release users can bypass auth if unsafe env is enabled | `scripts/check-release-env-safety.js` | Fail release when `EDEN_LOGIN_DISABLED=true` | Add Vercel release env validation |
| P0-REL-001 | Development route visible in release | runtime visibility | P0 | Unapproved or sensitive pages can appear to users | `lib/release/routeReleaseRegistry.ts` | Keep `release:check` and middleware route guard | Add browser smoke for release nav |
| P1-REL-001 | New page missing release status | runtime visibility | P1 | Page may be invisible or treated as development unexpectedly | `scripts/check-release-registry.js` | Add registry entry with every new page | Add PR checklist for route registry |
| P1-DOC-001 | Promotion workflow manual | release ops | P1 | Release transfer depends on operator discipline | `docs/release/PromotionToReleaseWorkflow.md` | Add CI/checklist automation | Create release CI workflow |
| P2-OPS-001 | Advanced deploy automation absent | ops | P2 | More manual checks before scale | `.github/workflows` | Add optional release safety workflow | Add release safety GitHub Action |

## Risks

- Release ortaminda yalnizca `release` route status'u aktif olmalidir.
- Development Supabase ayri project degilse field test verileri release'i kirletebilir.
- Promotion onayi olmadan migration calismasi en yuksek veri riski olarak kalir.

## Recommended Fixes

- Development Supabase project ref ve Release Supabase project ref Vercel env'lerinde acikca ayrilsin.
- Migration/seed/reset komutlarindan once `npm run supabase:target:check` calistirilsin.
- Yeni sayfalar varsayilan olarak `development` status ile route registry'ye eklensin.
- Release'e alinacak sayfa icin status ancak field test sonrasi `release` yapilsin.

## P0/P1/P2 Priority

- P0: Release veri guvenligi ve release route guard.
- P1: Eksik registry ve promotion otomasyonu.
- P2: Operasyonel temizlik ve ileri CI entegrasyonu.

## Suggested Next Prompt

Development Supabase + Development Vercel env dogrulamasini yap ve release smoke checklist'i calistir.
