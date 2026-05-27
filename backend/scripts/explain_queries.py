from __future__ import annotations

import argparse
import asyncio
from typing import Final

from sqlalchemy import text

from app.core.database import get_session_factory

QUERIES: Final[dict[str, str]] = {
    "company-list": """
        select id, trade_name, record_status, updated_at
        from public.companies
        where tenant_id = :tenant_id
          and coalesce(is_deleted, false) = false
        order by updated_at desc
        limit 50
    """,
    "branch-list": """
        select id, company_id, branch_name, record_status, updated_at
        from public.company_branches
        where tenant_id = :tenant_id
          and coalesce(is_deleted, false) = false
        order by updated_at desc
        limit 50
    """,
    "partner-list": """
        select id, company_id, display_name, record_status, updated_at
        from public.company_partners
        where tenant_id = :tenant_id
          and coalesce(is_deleted, false) = false
        order by updated_at desc
        limit 50
    """,
    "representative-list": """
        select id, company_id, display_name, record_status, updated_at
        from public.company_representatives
        where tenant_id = :tenant_id
          and coalesce(is_deleted, false) = false
        order by updated_at desc
        limit 50
    """,
    "outbox-pending": """
        select id, event_type, created_at
        from public.outbox_events
        where status = 'pending'
          and coalesce(retry_count, 0) < coalesce(max_retries, 5)
        order by created_at asc
        limit 50
    """,
    "audit-list": """
        select id, action_type, entity_type, entity_id, created_at
        from public.audit_logs
        where tenant_id = :tenant_id
        order by created_at desc
        limit 50
    """,
}


async def run(query_name: str, tenant_id: str, analyze: bool) -> None:
    if query_name not in QUERIES:
        valid = ", ".join(sorted(QUERIES))
        raise SystemExit(f"Unknown query '{query_name}'. Valid queries: {valid}")
    prefix = "explain (analyze, buffers, format text)" if analyze else "explain (format text)"
    sql = f"{prefix} {QUERIES[query_name]}"
    async with get_session_factory()() as session:
        result = await session.execute(text(sql), {"tenant_id": tenant_id})
        for row in result.scalars().all():
            print(row)


def main() -> None:
    parser = argparse.ArgumentParser(description="Explain Eden ERP projection queries.")
    parser.add_argument("query", choices=sorted(QUERIES))
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--analyze", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(args.query, args.tenant_id, args.analyze))


if __name__ == "__main__":
    main()
