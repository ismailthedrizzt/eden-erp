# ruff: noqa: E501

from __future__ import annotations

from datetime import UTC, datetime

from app.domains.reporting.metrics import build_kpis
from app.domains.reporting.schemas import ChartDataset, DashboardResponse, KpiCard
from app.domains.reporting.service import ReportingQueryContext, can

DASHBOARD_MODULES = [
    "company",
    "ownership",
    "representatives",
    "branches",
    "action-center",
    "accounting",
    "hr",
    "projects",
    "after-sales",
    "crm",
    "system",
]


async def get_dashboard(ctx: ReportingQueryContext) -> DashboardResponse:
    selected_modules = [ctx.filters.module_key] if ctx.filters.module_key else DASHBOARD_MODULES
    cards = []
    for module_key in selected_modules:
        if not module_key:
            continue
        cards.extend(await build_kpis(ctx, module_key))
    visible_cards = [item for item in cards if item.visible]
    charts = build_dashboard_charts(visible_cards)
    return DashboardResponse(
        filters=ctx.filters,
        cards=cards,
        charts=charts,
        warnings=dedupe(ctx.warnings),
        generated_at=datetime.now(UTC),
        permissions_summary={
            "financial": can(ctx.request_context, "accounting.view") or can(ctx.request_context, "reporting.viewFinancial"),
            "audit": can(ctx.request_context, "audit.view") or can(ctx.request_context, "reporting.viewAuditSummary"),
            "hr": can(ctx.request_context, "hr.view") or can(ctx.request_context, "reporting.viewHR"),
            "system": can(ctx.request_context, "settings.view") or can(ctx.request_context, "reporting.viewSystem"),
        },
    )


async def get_dashboard_summary(ctx: ReportingQueryContext) -> dict[str, object]:
    dashboard = await get_dashboard(ctx)
    visible_cards = [card for card in dashboard.cards if card.visible]
    return {
        "generated_at": dashboard.generated_at,
        "visible_cards": len(visible_cards),
        "warning_cards": len([card for card in visible_cards if card.status == "warning"]),
        "critical_cards": len([card for card in visible_cards if card.status == "critical"]),
        "hidden_cards": len([card for card in dashboard.cards if not card.visible]),
        "warnings": dashboard.warnings,
    }


async def get_module_dashboard(ctx: ReportingQueryContext, module_key: str) -> DashboardResponse:
    ctx.filters.module_key = module_key
    return await get_dashboard(ctx)


def build_dashboard_charts(cards: list[KpiCard]) -> list[ChartDataset]:
    status_counts = {"normal": 0, "warning": 0, "critical": 0, "info": 0}
    module_counts: dict[str, int] = {}
    for card in cards:
        status_counts[card.status] = status_counts.get(card.status, 0) + 1
        module_counts[card.module_key] = module_counts.get(card.module_key, 0) + 1
    return [
        ChartDataset(
            key="dashboard.statusDistribution",
            title="KPI durum dagilimi",
            chart_type="donut",
            labels=list(status_counts.keys()),
            data=[{"label": key, "value": value} for key, value in status_counts.items()],
        ),
        ChartDataset(
            key="dashboard.moduleCoverage",
            title="Modul kart dagilimi",
            chart_type="bar",
            labels=list(module_counts.keys()),
            data=[{"label": key, "value": value} for key, value in module_counts.items()],
        ),
    ]


def dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        result.append(item)
    return result
