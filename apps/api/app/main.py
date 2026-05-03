from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import modules, permissions, companies, workflows
from app.core.config import settings

app = FastAPI(title="Eden ERP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(modules.router, prefix="/modules", tags=["modules"])
app.include_router(permissions.router, prefix="/permissions", tags=["permissions"])
app.include_router(companies.router, prefix="/companies", tags=["companies"])
app.include_router(workflows.router, prefix="/workflows", tags=["workflows"])
