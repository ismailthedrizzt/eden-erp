# ruff: noqa: E501
from __future__ import annotations

from app.domains.search.schemas import SearchRequest, SearchResult


def normalize(value: object) -> str:
    return str(value or "").strip().casefold()


def calculate_confidence(
    query: str,
    *,
    title: str,
    fields: dict[str, object],
    current_page: str | None = None,
    target_page: str | None = None,
) -> tuple[float, list[str]]:
    q = normalize(query)
    if not q:
        return 0.2, []

    matched: list[str] = []
    score = 0.0
    for field, raw_value in fields.items():
        value = normalize(raw_value)
        if not value:
            continue
        if value == q:
            score = max(score, 1.0 if field in {"id", "code", "tax_number", "identity_number", "serial_no"} else 0.92)
            matched.append(field)
        elif value.startswith(q):
            score = max(score, 0.78 if field == "title" else 0.72)
            matched.append(field)
        elif q in value:
            score = max(score, 0.58 if field == "title" else 0.48)
            matched.append(field)

    if normalize(title) == q:
        score = max(score, 0.94)
        matched.append("title")
    elif normalize(title).startswith(q):
        score = max(score, 0.8)
        matched.append("title")

    if current_page and target_page and target_page.startswith(current_page):
        score = min(score + 0.08, 1.0)

    return round(score or 0.35, 3), sorted(set(matched))


def rank_results(results: list[SearchResult], request: SearchRequest) -> list[SearchResult]:
    def sort_key(result: SearchResult) -> tuple[float, int, str]:
        context_boost = 0.06 if request.current_page and result.target_page.startswith(request.current_page) else 0
        disabled_penalty = -0.25 if result.disabled else 0
        return (result.confidence + context_boost + disabled_penalty, -len(result.title), result.title)

    return sorted(results, key=sort_key, reverse=True)
