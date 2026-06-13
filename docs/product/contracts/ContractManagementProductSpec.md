# Contract Management Product Spec

<!-- source-of-truth-standard: contract overrides markdown -->


Date: 2026-06-06
Branch: main
Commit before work: 56bbffb
Environment: remote server, Next.js UI/BFF, FastAPI canonical backend, local PostgreSQL DB, local document storage.
Release status: Contract Management pages are registered as development; legacy /app/satis/sozlesmeler redirects to /app/sozlesmeler and is hidden.


## Principle
Belge s?zle?me de?ildir. S?zle?me dosyas? merkezi Document Management i?inde bir belgedir; s?zle?me ise ayr? i? kayd?d?r.

## MVP Scope
- Central S?zle?meler module at `/app/sozlesmeler`.
- Draft contract creation with card-safe fields.
- Contract detail with parties, documents, obligations and lifecycle history.
- FastAPI CRUD and lifecycle endpoints under `/api/v1/contracts`.
- Next API routes are proxy-only under `/api/contracts`.
- Document integration uses `entityType=contract`, `relationType=contract_document` and existing duplicate file reuse.

## Out Of Scope
E-signature, clause editor, legal AI review, portal approval, automatic invoicing and advanced approval workflows are known gaps.
