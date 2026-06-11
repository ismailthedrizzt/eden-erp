import os
from collections.abc import AsyncIterator
from typing import Any

import pytest

try:
    import asyncpg  # type: ignore[import-untyped]
except ModuleNotFoundError:  # pragma: no cover
    asyncpg = None


pytestmark = pytest.mark.skipif(
    os.getenv("EDEN_RUN_LIVE_DB_CONTRACTS") != "true" or asyncpg is None,
    reason="Live DB schema contract tests require EDEN_RUN_LIVE_DB_CONTRACTS=true and asyncpg.",
)


DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_DSN")


@pytest.fixture()
async def db() -> AsyncIterator[Any]:
    if not DATABASE_URL:
        pytest.skip("DATABASE_URL or POSTGRES_DSN is required for live DB schema contracts.")
    assert asyncpg is not None
    connection = await asyncpg.connect(DATABASE_URL)
    try:
        yield connection
    finally:
        await connection.close()


async def column_names(db: Any, table_name: str) -> set[str]:
    rows = await db.fetch(
        """
        select column_name
        from information_schema.columns
        where table_schema = 'public' and table_name = $1
        """,
        table_name,
    )
    return {row["column_name"] for row in rows}


async def not_null_columns(db: Any, table_name: str) -> set[str]:
    rows = await db.fetch(
        """
        select column_name
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
          and is_nullable = 'NO'
        """,
        table_name,
    )
    return {row["column_name"] for row in rows}


async def table_constraints(db: Any, table_name: str) -> list[dict[str, Any]]:
    rows = await db.fetch(
        """
        select conname, contype, pg_get_constraintdef(c.oid) as definition
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public' and t.relname = $1
        """,
        table_name,
    )
    return [dict(row) for row in rows]


async def index_definitions(db: Any, table_name: str) -> list[str]:
    rows = await db.fetch(
        """
        select indexdef
        from pg_indexes
        where schemaname = 'public' and tablename = $1
        """,
        table_name,
    )
    return [row["indexdef"] for row in rows]


@pytest.mark.asyncio
async def test_tenant_scoped_tables_have_required_contract_columns(db: Any) -> None:
    for table_name in [
        "companies",
        "company_partners",
        "company_representatives",
        "operation_requests",
        "employees",
    ]:
        columns = await column_names(db, table_name)
        required = {"tenant_id", "created_at", "updated_at"}
        missing = required - columns
        assert not missing, f"{table_name} missing required columns: {sorted(missing)}"


@pytest.mark.asyncio
async def test_tenant_id_is_not_nullable_for_core_tables(db: Any) -> None:
    for table_name in [
        "companies",
        "company_partners",
        "company_representatives",
        "operation_requests",
        "employees",
    ]:
        not_null = await not_null_columns(db, table_name)
        assert "tenant_id" in not_null, f"{table_name}.tenant_id must be NOT NULL"


@pytest.mark.asyncio
async def test_core_tables_have_foreign_keys(db: Any) -> None:
    for table_name in [
        "company_partners",
        "company_representatives",
        "operation_requests",
        "employees",
    ]:
        constraints = await table_constraints(db, table_name)
        assert any(item["contype"] == "f" for item in constraints), (
            f"{table_name} must define FK constraints"
        )


@pytest.mark.asyncio
async def test_lifecycle_status_columns_have_check_constraints(db: Any) -> None:
    for table_name in ["operation_requests", "company_representatives"]:
        constraints = await table_constraints(db, table_name)
        status_checks = [
            item for item in constraints
            if item["contype"] == "c"
            and ("status" in item["definition"] or "workflow" in item["definition"])
        ]
        assert status_checks, f"{table_name} must constrain lifecycle/status values"


@pytest.mark.asyncio
async def test_soft_delete_and_audit_fields_are_present(db: Any) -> None:
    for table_name in ["companies", "company_partners", "company_representatives", "employees"]:
        columns = await column_names(db, table_name)
        assert "created_at" in columns, f"{table_name} missing created_at"
        assert "updated_at" in columns, f"{table_name} missing updated_at"
        assert {"deleted_at", "is_deleted"} & columns, f"{table_name} missing soft-delete field"


@pytest.mark.asyncio
async def test_operation_request_idempotency_unique_index(db: Any) -> None:
    indexes = await index_definitions(db, "operation_requests")
    required_terms = [
        "tenant_id",
        "operation_type",
        "entity_type",
        "entity_id",
        "client_request_id",
        "requested_by",
    ]
    matching = [
        indexdef for indexdef in indexes
        if "UNIQUE" in indexdef.upper() and all(term in indexdef for term in required_terms)
    ]
    assert matching, "operation_requests must have tenant-scoped idempotency unique index"


@pytest.mark.asyncio
async def test_tenant_scoped_indexes_exist_for_core_lists(db: Any) -> None:
    for table_name in ["companies", "company_partners", "company_representatives", "employees"]:
        indexes = await index_definitions(db, table_name)
        assert any("tenant_id" in indexdef for indexdef in indexes), (
            f"{table_name} must have tenant_id index"
        )
