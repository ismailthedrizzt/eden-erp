# Single Main Virtual Server Deployment

## Decision

Eden ERP now uses a single product branch:

```text
main
```

Local and live behavior is separated by environment variables, not by branches.

## Runtime Map

| runtime | branch | database/auth/storage | env source | AI runtime |
|---|---|---|---|---|
| Local machine | `main` | Development Supabase | `.env.local` | optional local Ollama |
| Virtual Server | `main` | Live Supabase | `/etc/eden-erp/eden-erp.env` | Ollama on the same VS |

## Local Setup

1. Stay on `main`.
2. Copy `.env.local.example` to `.env.local`.
3. Fill only Development Supabase values.
4. Keep `NEXT_PUBLIC_APP_ENV=development`.
5. Run:

```bash
npm install
npm run dev
```

Local migration, seed, reset and demo commands must point only to Development Supabase.

## Virtual Server Setup

Recommended live path:

```bash
sudo mkdir -p /opt/eden-erp
sudo git clone <repo-url> /opt/eden-erp/app
cd /opt/eden-erp/app
git checkout main
```

Create `/etc/eden-erp/eden-erp.env` from `.env.release.example` and fill live values:

```env
NEXT_PUBLIC_APP_ENV=release
NEXT_PUBLIC_RELEASE_CHANNEL=release
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=<live-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<live-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<live-service-role-key>
SUPABASE_PROJECT_REF=<live-project-ref>
RELEASE_SUPABASE_PROJECT_REF=<live-project-ref>
DEVELOPMENT_SUPABASE_PROJECT_REF=<development-project-ref-for-guard>
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
```

Then install Ollama on the VS:

```bash
bash scripts/install-ollama-vps.sh
```

Install the Next.js service using `scripts/eden-erp-next.service.example` as a template, then deploy from `main`:

```bash
bash scripts/deploy-main-vps.sh
```

The deploy script fetches `origin/main`, loads `/etc/eden-erp/eden-erp.env`, runs checks/build, and restarts the configured service.

## Automatic Pull

The simplest automation is a GitHub webhook or cron job on the VS that runs:

```bash
APP_DIR=/opt/eden-erp/app ENV_FILE=/etc/eden-erp/eden-erp.env bash /opt/eden-erp/app/scripts/deploy-main-vps.sh
```

Do not store live secrets in GitHub. The VS env file is the live secret source.

## Safety Checks

Before a live restart, the deploy script runs:

```bash
npm run typecheck:fast
npm run env:safety
npm run release:check
npm run build
```

`npm run supabase:target:check` should be run before any migration, seed, reset or import command.

## Branch Policy

- `main` is the only long-lived branch.
- `develop` is not used.
- Temporary work branches may exist for isolated work, but they merge back into `main`.
- Live VS pulls only `origin/main`.
