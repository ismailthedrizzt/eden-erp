# ruff: noqa: E501

from __future__ import annotations

from typing import Any

from fastapi import status

from app.core.errors import DomainError


def assert_company_scope(context: dict[str, Any], company_id: object | None, *, writable: bool = False) -> None:
    if not company_id:
        return
    scope_key = "writable_company_scope_ids" if writable else "company_scope_ids"
    scope = context.get(scope_key)
    if scope is None:
        return
    if str(company_id) not in {str(item) for item in scope}:
        raise DomainError("Bu belge erisim kapsaminiz disinda.", "DOCUMENT_SCOPE_DENIED", status.HTTP_403_FORBIDDEN)


def assert_document_access(context: dict[str, Any], document: dict[str, Any], *, writable: bool = False) -> None:
    assert_company_scope(context, document.get("company_id"), writable=writable)
    if document.get("is_deleted") or document.get("status") == "deleted":
        raise DomainError("Belge silinmis veya arsivlenmis.", "DOCUMENT_NOT_AVAILABLE", status.HTTP_410_GONE)
