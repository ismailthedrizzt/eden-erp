from __future__ import annotations

from pydantic import BaseModel, Field


class ModuleReadinessDefinition(BaseModel):
    module_key: str
    required_tables: list[str] = Field(default_factory=list)
    optional_tables: list[str] = Field(default_factory=list)
    required_views: list[str] = Field(default_factory=list)
    optional_views: list[str] = Field(default_factory=list)
    required_rpcs: list[str] = Field(default_factory=list)
    optional_rpcs: list[str] = Field(default_factory=list)
    required_settings: list[str] = Field(default_factory=list)
    required_dependencies: list[str] = Field(default_factory=list)
    optional_dependencies: list[str] = Field(default_factory=list)
    setup_steps: list[str] = Field(default_factory=list)


class ModuleReadinessResult(BaseModel):
    module_key: str
    ok: bool
    status: str
    message: str
    missing_tables: list[str] = Field(default_factory=list)
    missing_views: list[str] = Field(default_factory=list)
    missing_rpcs: list[str] = Field(default_factory=list)
    missing_dependencies: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    setup_steps: list[str] = Field(default_factory=list)
    details: dict[str, list[str]] = Field(default_factory=dict)


class TenantReadinessResult(BaseModel):
    tenant_id: str
    ok: bool
    status: str
    modules: dict[str, ModuleReadinessResult]
    blocking_modules: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
