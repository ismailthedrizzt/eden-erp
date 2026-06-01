# Eden Teknoloji ERP

Eden ERP, moduler ERP platformu olarak tasarlanan yeni nesil bir is uygulamasidir. Mevcut repo bugun Next.js agirlikli calisir; hedef mimari ise Next.js frontend/BFF ve FastAPI/Python core backend ayrimidir.

## Mimari Durum

### Mevcut Durum

- Next.js 15 App Router tabanli frontend ve gecis donemi API route'lari.
- React 19, TypeScript ve Tailwind CSS ile uygulama arayuzu.
- Supabase/PostgreSQL veri katmani, Supabase Auth ve Supabase Storage entegrasyonu.
- TypeScript tarafinda domain, operation, process, audit, outbox ve policy katmanlarinin MVP/contract hazirligi.

### Hedef Durum

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS.
- **BFF / Adapter**: Next.js API routes, yalnizca gecis donemi proxy/adaptor ve UI-specific endpoint olarak.
- **Core Backend**: FastAPI / Python, SQLAlchemy veya SQLModel, Pydantic v2, Alembic, PostgreSQL/Supabase ve background worker altyapisi.
- **Database/Auth/Storage**: Supabase/PostgreSQL, Supabase Auth ve Supabase Storage.

Next.js API route'lari kalici business logic katmani degildir. Domain logic, operation orchestration, process engine, policy engine, integrity checks, audit, outbox ve transaction boundary kademeli olarak FastAPI backend tarafina tasinacaktir.

## Gereksinimler

- Node.js 24 LTS
- npm 10+
- Python 3.12+ (FastAPI backend scaffold icin)

## Yerel Calistirma

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

Yerel / release Ollama:

```bash
npm run ollama:install:release
npm run ollama:serve
```

Varsayilan kurulum `tools/ollama` altina standalone Ollama binary dosyalarini, `.ollama/models` altina model deposunu yerlestirir. Release makinesinde model de indirilecekse:

```bash
npm run ollama:pull
```

## Ortam Degiskenleri

`.env.local.example` dosyasini `.env.local` olarak kopyalayip doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_APP_NAME`

FastAPI backend icin `backend/.env` veya sistem ortam degiskenleri kullanilabilir. Ilk scaffold `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` ve `CORS_ORIGINS` alanlarini destekleyecek sekilde hazirlanmistir.

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

## Deployment Model

Target deployment is no longer a single Next.js app:

- Next.js web/BFF container or Vercel deployment.
- FastAPI core backend container.
- Python worker container/process for outbox and background work.
- Supabase/PostgreSQL for DB/Auth/Storage.

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
