# Eden Teknoloji ERP

Eden ERP, moduler ERP platformu olarak tasarlanan yeni nesil bir is uygulamasidir. Guncel deployment modeli uzak sunucu, Next.js UI/BFF, FastAPI canonical backend ve sunucu uzerindeki yerel PostgreSQL/local DB yapisidir.

## Mimari Durum

### Mevcut Durum

- Next.js 15 App Router tabanli frontend ve gecis donemi API route'lari.
- React 19, TypeScript ve Tailwind CSS ile uygulama arayuzu.
- Yerel PostgreSQL/local DB veri katmani, app-session auth ve local filesystem media storage.
- TypeScript tarafinda domain, operation, process, audit, outbox ve policy katmanlarinin MVP/contract hazirligi.

### Hedef Durum

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS.
- **BFF / Adapter**: Next.js API routes, yalnizca gecis donemi proxy/adaptor ve UI-specific endpoint olarak.
- **Core Backend**: FastAPI / Python, SQLAlchemy veya SQLModel, Pydantic v2, Alembic, PostgreSQL ve background worker altyapisi.
- **Database/Auth/Storage**: Local PostgreSQL/local DB, app-session auth, trusted proxy context ve local filesystem controlled media route.

Next.js API route'lari kalici business logic katmani degildir. Domain logic, operation orchestration, process engine, policy engine, integrity checks, audit, outbox ve transaction boundary kademeli olarak FastAPI backend tarafina tasinacaktir.

## Gereksinimler

- Node.js 24 LTS
- npm 10+
- Python 3.12+ (FastAPI backend scaffold icin)

## Yerel Calistirma

Tek kalici branch `main`dir. Calisma ortami uzak sunucudur; ortam farki branch ile degil APP_ENV/NEXT_PUBLIC_APP_ENV, DATABASE_URL ve servis env degerleriyle yonetilir.

Frontend:

```bash
npm install
npm run dev
```

Tarayicida ac:

- `http://localhost:3000`
- `http://localhost:3000/login`

FastAPI backend scaffold:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Backend health endpointleri:

- `http://localhost:8000/health`
- `http://localhost:8000/api/v1/health`

Yerel Ollama (Windows, opsiyonel):

```bash
npm run ollama:install:windows
npm run ollama:serve
```

Varsayilan Windows kurulumu `tools/ollama` altina standalone Ollama binary dosyalarini, `.ollama/models` altina model deposunu yerlestirir.

Virtual Server Ollama:

```bash
bash scripts/install-ollama-vps.sh
```

VS tarafinda Ollama servis olarak calisir. Uygulama `OLLAMA_BASE_URL=http://127.0.0.1:11434` ile baglanir.

## Ortam Degiskenleri

Uzak sunucu icin servis env veya `.env.local` su canonical alanlari tasir:

- `APP_ENV`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_RELEASE_CHANNEL`
- `DATABASE_URL`
- `DATABASE_TARGET_CLASS`
- `APP_SESSION_SECRET`
- `FASTAPI_BASE_URL`
- `INTERNAL_BACKEND_TOKEN`
- `ALLOW_TRUSTED_PROXY_HEADERS`
- `TRUSTED_PROXY_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

Live secret'lari repoya koymayin. FastAPI backend icin `backend/.env` veya sistem ortam degiskenleri kullanilabilir.

## Dogrulama

TypeScript / Next.js:

```bash
npm run lint
npm run typecheck
npm run build
```

Python backend:

Final release gate dokumanlari:

- `docs/release/MVPReleaseReadinessReport.md`
- `docs/release/Next30DayRoadmap.md`
- `docs/release/FinalManualSmokeChecklist.md`

```bash
npm run backend:lint
npm run backend:typecheck
npm run backend:test
```

Python komutlari icin once `backend` dependencies kurulmalidir. `npm run check:all` bugun Next.js kontrollerini calistirir ve backend kontrolleri icin kurulum notu verir; Python CI adimi ayrica etkinlestirilecektir.

Deployment readiness helpers:

```bash
npm run env:safety
npm run migration:status
npm run boundaries:check
npm run ts-backend:inventory
npm run smoke:test:dry
docker compose config
```

CI workflow `.github/workflows/ci.yml` frontend, backend, OpenAPI drift and Docker build checks for the Next + FastAPI + worker topology.

Tek branch + uzak sunucu deploy modeli:

- [Remote Server Deployment Runbook](./docs/operations/RemoteServerDeploymentRunbook.md)
- [Environment Strategy](./docs/architecture/EnvironmentStrategy.md)

## Deployment Model

Target deployment is not a single Next.js app:

- Next.js web/BFF process on the remote server.
- FastAPI core backend container.
- Python worker container/process for outbox and background work.
- Local PostgreSQL/local DB for data.
- App-session auth through Next.js and trusted proxy context into FastAPI.
- Local filesystem media storage through controlled media routes.

Local container files:

- `Dockerfile.next`
- `backend/Dockerfile`
- `docker-compose.yml`

Environment, CI/CD, rollback and smoke-test strategy are documented in `docs/architecture`.

Core ERP backend behavior belongs in FastAPI/Python. New Next.js API route code must stay in BFF/proxy, UI adapter, upload adapter or session/bootstrap boundaries.

## Migration Strategy

1. FastAPI scaffold ve OpenAPI sozlesmesi source of truth olarak kurulacak.
2. Next.js API route'lari once proxy/adaptor haline getirilecek.
3. Kritik operationlar P0 sirasiyla Python'a tasinacak: Branch opening/closing, company official changes, capital increase, representative authority ve ownership transactions.
4. Process, Outbox, Audit, Policy ve Integrity katmanlari Python servis/worker mimarisine alinacak.
5. TypeScript tarafinda yalnizca UI, frontend stores, API client wrapper'lari ve shared/generated contract tipleri kalacak.

Detayli haritalar:

- `docs/architecture/ProductizationReadinessReport.md`
- `docs/architecture/FastAPIEndpointCoverageMatrix.md`
- `docs/architecture/NextProxyCoverageMatrix.md`
- `docs/architecture/RemainingTsBackendInventory.md`

- [Codebase Inventory](./docs/architecture/CodebaseInventory.md)
- [Python Backend Migration](./docs/architecture/PythonBackendMigration.md)
- [Next API Route Migration Inventory](./docs/architecture/NextApiRouteMigrationInventory.md)
- [Python Migration Map](./docs/architecture/PythonMigrationMap.md)
- [Python Migration Roadmap](./docs/architecture/PythonMigrationRoadmap.md)
- [OpenAPI Contract Strategy](./docs/architecture/OpenAPIContractStrategy.md)
- [Scaling Architecture](./docs/architecture/ScalingArchitecture.md)
- [Next Cleanup Plan](./docs/architecture/NextCleanupPlan.md)

## Visual Studio

Visual Studio 2022 ile [eden-erp.esproj](C:/Users/ismai/Desktop/eden-erp/eden-erp.esproj) dosyasini acip `Start` ile Next.js uygulamasini calistirabilirsiniz.
