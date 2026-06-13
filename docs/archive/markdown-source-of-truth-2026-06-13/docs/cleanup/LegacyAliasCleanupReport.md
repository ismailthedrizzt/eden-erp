# Legacy Alias Cleanup Report

Date: 2026-06-06
Branch: main
Commit: 7207a273b12ad833ed34b173925d6ba5aaabb3f3
Environment: remote server, release app surface, local PostgreSQL/local DB, FastAPI canonical backend, Next.js BFF/proxy


## Inventory
| Alias route | Canonical route | Action | Test/result |
| --- | --- | --- | --- |
| `/muhasebe` | `/app/muhasebe` | hidden kept | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |
| `/muhasebe/cari-kartlar` | `/app/muhasebe/cari-kartlar` | hidden kept | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |
| `/muhasebe/cari-hareketler` | `/app/muhasebe/cari-hareketler` | hidden kept | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |
| `/muhasebe/on-muhasebe-hareketleri` | `/app/muhasebe/on-muhasebe-hareketleri` | hidden kept | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |
| `/ik/personel` | `/app/ik/calisanlar` | hidden kept | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |
| `/app/ik/personel` | `/app/ik/calisanlar` | development kept | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |
| `/app/demo/*` | `none` | development/hidden inventory | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |
| `/test` | `none` | hidden guarded | Release registry prevents release visibility; direct behavior retained to avoid breaking old bookmarks. |

## Action Taken
No high-risk route deletion was performed. The release registry already marks legacy public aliases hidden and keeps `/app/ik/personel` as development, while `/app/ik/calisanlar` remains the canonical HR employee surface. Misleading legacy docs were deprecated.

## Remaining Risk
- P0: none observed; release check prevents legacy public aliases from being release-visible.
- P1: old bookmarks can still reach hidden wrappers/direct routes; direct route guard behavior should be manually smoke-tested.
- P2: legacy pages can be deleted after telemetry/caller audit.
