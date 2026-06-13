# Typecheck Workflow

<!-- source-of-truth-standard: contract overrides markdown -->

Eden ERP Next.js yuzeyi buyudukce tek parca TypeScript kontrolu lokal gelistirme icin agir hale geldi. Bu yuzden kontroller iki hiz sinifina ayrildi.

## Gunluk Lokal Kontrol

```bash
npm run typecheck
```

Bu komut su kontrolleri calistirir:

- `typecheck:shared`: `packages/shared` sozlesmelerini dar kapsamda kontrol eder.
- `typecheck:fast`: Git'e gore degismis tracked `.ts` ve `.tsx` dosyalarini hedefli TypeScript programi ile kontrol eder.

Untracked WIP dosyalarini da dahil etmek icin:

```bash
npm run typecheck:fast:all
```

Belirli dosyalari kontrol etmek icin:

```bash
npm run typecheck:fast -- app/api/tenants/current/route.ts lib/api/apiClient.ts
```

## Kapsamli Kontroller

```bash
npm run typecheck:ci
```

Shared sozlesmeleri ve Next app yuzeyini kontrol eder. Lokal makinede yavas olabilir; CI, merge oncesi veya genis refactor sonrasi icin uygundur.

```bash
npm run typecheck:full
```

Eski catch-all davranisini korur ve `tsconfig.typecheck.json` uzerinden tum repo TypeScript yuzeyini tarar.
