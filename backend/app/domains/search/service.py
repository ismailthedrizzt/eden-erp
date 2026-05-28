# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DomainError
from app.core.serialization import row_to_dict, rows_to_dicts
from app.domains.operations.service import table_exists
from app.domains.search.commands import list_default_quick_actions, search_action_commands
from app.domains.search.ranking import rank_results
from app.domains.search.registry import list_search_providers
from app.domains.search.schemas import (
    CommandPaletteResponse,
    RecentItemRequest,
    SearchGroup,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchSuggestion,
)
from app.features.registry import is_feature_enabled

GROUP_LABELS = {
    "records": "Kayitlar",
    "actions": "Islemler",
    "tasks": "Gorevler ve Onaylar",
    "documents": "Belgeler",
    "reports": "Raporlar",
    "settings": "Ayarlar",
    "help": "Yardim",
}

RESULT_GROUP_MAP = {
    "action": "actions",
    "task": "tasks",
    "document": "documents",
    "report": "reports",
    "setting": "settings",
    "help": "help",
}

DEFAULT_SUGGESTIONS = [
    ("Ilk sirketi olustur", "action", "Yeni calisma alani icin baslangic aksiyonu."),
    ("Ankara Subesi", "record", "Sube veya lokasyon arama ornegi."),
    ("sermaye artirimi", "action", "Resmi islem komutu ornegi."),
    ("bekleyen onaylar", "task", "Action Center ve gorev/onay arama ornegi."),
    ("belge aranacak hareketler", "report", "Rapor/finans arama ornegi."),
]


def service_context(context: Any, tenant_id: str) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": getattr(context, "user_id", None),
        "permissions": getattr(context, "permissions", []),
        "company_scope_ids": getattr(context, "company_scope_ids", None),
        "branch_scope_ids": getattr(context, "branch_scope_ids", None),
        "is_internal": getattr(context, "is_internal", False),
        "module_key": "search",
    }


async def global_search(
    session: AsyncSession,
    context: dict[str, Any],
    request: SearchRequest,
) -> SearchResponse:
    warnings: list[str] = []
    query = request.query.strip()
    normalized_request = request.model_copy(update={"query": query})

    if not is_feature_enabled(str(context["tenant_id"]), "search.enabled"):
        return SearchResponse(
            query=query,
            suggestions=default_suggestions(query),
            warnings=["SEARCH_FEATURE_DISABLED"],
        )

    provider_results: list[SearchResult] = []
    if len(query) >= 2 or _looks_like_exact_lookup(query):
        for provider in list_search_providers():
            if request.module_filter and provider.module_key != request.module_filter:
                continue
            if request.entity_types and not set(provider.entity_types).intersection(request.entity_types):
                continue
            if not await provider.enabled(session, context):
                continue
            try:
                provider_results.extend(await provider.search(session, context, normalized_request))
            except Exception:
                await session.rollback()
                warnings.append(f"{provider.key}.partial_unavailable")

    actions: list[SearchResult] = []
    if request.include_actions or request.include_commands:
        try:
            actions = await search_action_commands(session, context, normalized_request)
        except Exception:
            await session.rollback()
            warnings.append("actions.partial_unavailable")

    recent = await list_recent_items(session, context, limit=8) if request.include_recent else []
    ranked = rank_results([*provider_results, *actions], normalized_request)[: request.limit]
    groups = group_results(ranked)
    return SearchResponse(
        query=query,
        results=ranked,
        groups=groups,
        suggestions=default_suggestions(query),
        actions=rank_results(actions, normalized_request)[:8],
        recent=recent,
        warnings=warnings,
    )


async def command_palette(
    session: AsyncSession,
    context: dict[str, Any],
    request: SearchRequest,
) -> CommandPaletteResponse:
    response = await global_search(
        session,
        context,
        request.model_copy(update={"include_actions": True, "include_recent": True, "include_commands": True}),
    )
    quick_actions = response.actions[:6] if response.actions else list_default_quick_actions()
    return CommandPaletteResponse(
        query=response.query,
        top_result=response.results[0] if response.results else None,
        grouped_results=response.groups,
        quick_actions=quick_actions,
        recent_items=response.recent,
        suggestions=response.suggestions,
        warnings=response.warnings,
    )


async def suggestions(
    session: AsyncSession,
    context: dict[str, Any],
    query: str,
    *,
    limit: int = 8,
) -> list[SearchSuggestion]:
    items = default_suggestions(query)
    recent = await list_recent_items(session, context, limit=limit)
    for item in recent:
        items.append(SearchSuggestion(text=item.title, type="recent", reason=item.subtitle))
    return items[:limit]


async def list_recent_items(
    session: AsyncSession,
    context: dict[str, Any],
    *,
    limit: int = 8,
) -> list[SearchResult]:
    if not is_feature_enabled(str(context["tenant_id"]), "search.recentItems"):
        return []
    if not context.get("user_id"):
        return []
    if not await table_exists(session, "public.user_recent_items"):
        return []
    result = await session.execute(
        text(
            """
            select id::text, entity_type, entity_id, title, target_page, module_key,
                   last_opened_at, open_count
            from public.user_recent_items
            where tenant_id = :tenant_id
              and user_id = :user_id
            order by last_opened_at desc
            limit :limit
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context["user_id"],
            "limit": min(max(limit, 1), 20),
        },
    )
    rows = rows_to_dicts(result.mappings().all())
    return [
        SearchResult(
            id=f"recent:{row.get('entity_type')}:{row.get('entity_id')}",
            result_type="record",
            entity_type=str(row.get("entity_type") or ""),
            entity_id=str(row.get("entity_id") or ""),
            module_key=str(row.get("module_key") or "settings"),
            title=str(row.get("title") or "Son acilan kayit"),
            subtitle=f"Son acilan · {row.get('open_count') or 1} kez",
            badge="Son",
            icon="Clock",
            target_page=str(row.get("target_page") or "/app"),
            confidence=0.45,
            metadata={"recent_id": row.get("id"), "last_opened_at": row.get("last_opened_at")},
        )
        for row in rows
    ]


async def record_recent_item(
    session: AsyncSession,
    context: dict[str, Any],
    request: RecentItemRequest,
) -> dict[str, Any]:
    if not is_feature_enabled(str(context["tenant_id"]), "search.recentItems"):
        raise DomainError("Son acilanlar ozelligi kapali.", "SEARCH_RECENT_DISABLED", status.HTTP_409_CONFLICT)
    if not context.get("user_id"):
        raise DomainError("Son kayit icin kullanici dogrulanmali.", "SEARCH_RECENT_USER_REQUIRED", status.HTTP_401_UNAUTHORIZED)
    if not await table_exists(session, "public.user_recent_items"):
        raise DomainError("Arama recent altyapisi hazir degil.", "SEARCH_RECENT_TABLE_MISSING", status.HTTP_409_CONFLICT)
    result = await session.execute(
        text(
            """
            insert into public.user_recent_items (
              tenant_id, user_id, entity_type, entity_id, title, target_page, module_key,
              last_opened_at, open_count
            )
            values (
              :tenant_id, :user_id, :entity_type, :entity_id, :title, :target_page,
              :module_key, now(), 1
            )
            on conflict (tenant_id, user_id, entity_type, entity_id)
            do update set
              title = excluded.title,
              target_page = excluded.target_page,
              module_key = excluded.module_key,
              last_opened_at = now(),
              open_count = public.user_recent_items.open_count + 1
            returning *
            """
        ),
        {
            "tenant_id": context["tenant_id"],
            "user_id": context["user_id"],
            "entity_type": request.entity_type,
            "entity_id": request.entity_id,
            "title": request.title[:240],
            "target_page": request.target_page[:500],
            "module_key": request.module_key,
        },
    )
    return row_to_dict(result.mappings().one()) or {}


async def entity_lookup(
    session: AsyncSession,
    context: dict[str, Any],
    entity_type: str,
    entity_id: str,
) -> SearchResponse:
    request = SearchRequest(query=entity_id, entity_types=[entity_type], limit=5, include_actions=False, include_recent=False)
    return await global_search(session, context, request)


def group_results(results: list[SearchResult]) -> list[SearchGroup]:
    groups: dict[str, list[SearchResult]] = {}
    for result in results:
        key = RESULT_GROUP_MAP.get(result.result_type, "records")
        groups.setdefault(key, []).append(result)
    ordered_keys = ["records", "actions", "tasks", "documents", "reports", "settings", "help"]
    return [
        SearchGroup(
            key=key,
            label=GROUP_LABELS[key],
            results=groups[key],
            total_count=len(groups[key]),
        )
        for key in ordered_keys
        if groups.get(key)
    ]


def default_suggestions(query: str) -> list[SearchSuggestion]:
    q = query.strip().casefold()
    suggestions = [
        SearchSuggestion(text=text, type=item_type, reason=reason)
        for text, item_type, reason in DEFAULT_SUGGESTIONS
        if not q or q in text.casefold() or any(part in text.casefold() for part in q.split())
    ]
    return suggestions[:6]


def _looks_like_exact_lookup(query: str) -> bool:
    if len(query) < 2:
        return False
    return any(char.isdigit() for char in query) or "-" in query or len(query) >= 8
