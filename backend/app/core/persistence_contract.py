from __future__ import annotations

from sqlalchemy import text

from app.core.database import get_session_factory

EXPECTED_ALEMBIC_REVISION = "20260610_0120"

REQUIRED_PERSISTENCE_COLUMNS = {
    "audit_logs": {
        "id",
        "tenant_id",
        "company_id",
        "branch_id",
        "module_key",
        "entity_type",
        "entity_id",
        "resource",
        "record_id",
        "action",
        "action_type",
        "action_key",
        "operation_id",
        "process_instance_id",
        "task_id",
        "approval_id",
        "outbox_event_id",
        "user_id",
        "before_json",
        "after_json",
        "old_values",
        "new_values",
        "changed_fields",
        "summary",
        "result_status",
        "severity",
        "metadata_json",
        "created_at",
    },
    "outbox_events": {
        "id",
        "tenant_id",
        "company_id",
        "module_key",
        "event_type",
        "event_version",
        "aggregate_type",
        "aggregate_id",
        "operation_id",
        "process_instance_id",
        "causation_id",
        "correlation_id",
        "payload_json",
        "metadata_json",
        "status",
        "retry_count",
        "max_retries",
        "locked_at",
        "locked_by",
        "occurred_at",
        "created_at",
        "updated_at",
        "published_at",
        "error_json",
    },
}


async def verify_persistence_contract() -> None:
    async with get_session_factory()() as session:
        version = await session.execute(
            text(
                """
                select version_num
                from public.alembic_version
                order by version_num desc
                limit 1
                """
            )
        )
        current_revision = version.scalar()
        if current_revision != EXPECTED_ALEMBIC_REVISION:
            raise RuntimeError(
                "Database migration contract is not current. "
                f"Expected {EXPECTED_ALEMBIC_REVISION}, got {current_revision}."
            )

        for table_name, required_columns in REQUIRED_PERSISTENCE_COLUMNS.items():
            result = await session.execute(
                text(
                    """
                    select column_name
                    from information_schema.columns
                    where table_schema = 'public'
                      and table_name = :table_name
                    """
                ),
                {"table_name": table_name},
            )
            columns = {str(column) for column in result.scalars().all()}
            missing = sorted(required_columns - columns)
            if missing:
                raise RuntimeError(
                    f"Persistence table public.{table_name} is not compatible. "
                    f"Missing columns: {', '.join(missing)}."
                )
