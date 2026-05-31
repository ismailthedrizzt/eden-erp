from __future__ import annotations

# ruff: noqa: E501
from typing import Any

from fastapi import status
from sqlalchemy import text

from app.core.errors import DomainError
from app.domains.integrations.apps import get_app
from app.domains.integrations.schemas import CredentialCreateRequest
from app.domains.integrations.service import (
    IntegrationContext,
    ensure_integration_tables,
    normalize_row,
    record_integration_audit_best_effort,
    require_user_id,
)
from app.domains.integrations.signatures import generate_secret, hash_secret, secret_preview


async def create_credential(ctx: IntegrationContext, app_id: str, request: CredentialCreateRequest) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, apps=True, credentials=True)
    await get_app(ctx, app_id)
    created_by = require_user_id(ctx)
    secret = request.secret or generate_secret()
    inserted = await ctx.session.execute(
        text(
            """
            insert into public.integration_credentials (
              tenant_id, integration_app_id, credential_type, name, secret_hash,
              secret_preview, expires_at, status, created_by
            )
            values (
              :tenant_id, :integration_app_id, :credential_type, :name, :secret_hash,
              :secret_preview, :expires_at, 'active', :created_by
            )
            returning id, tenant_id, integration_app_id, credential_type, name, secret_preview,
                      expires_at, last_used_at, status, created_by, created_at, revoked_by, revoked_at
            """
        ),
        {
            "tenant_id": ctx.tenant_id,
            "integration_app_id": app_id,
            "credential_type": request.credential_type,
            "name": request.name,
            "secret_hash": hash_secret(secret),
            "secret_preview": secret_preview(secret),
            "expires_at": request.expires_at,
            "created_by": created_by,
        },
    )
    row = normalize_row(inserted.mappings().one())
    row["secret"] = secret
    await record_integration_audit_best_effort(ctx, action_type="credential_created", entity_type="integration_credential", entity_id=str(row["id"]), metadata={"integration_app_id": app_id})
    return row


async def list_credentials(ctx: IntegrationContext, app_id: str) -> list[dict[str, Any]]:
    await ensure_integration_tables(ctx.session, apps=True, credentials=True)
    await get_app(ctx, app_id)
    result = await ctx.session.execute(
        text(
            """
            select id, tenant_id, integration_app_id, credential_type, name, secret_preview,
                   expires_at, last_used_at, status, created_by, created_at, revoked_by, revoked_at
            from public.integration_credentials
            where tenant_id = :tenant_id and integration_app_id = :app_id
            order by created_at desc
            """
        ),
        {"tenant_id": ctx.tenant_id, "app_id": app_id},
    )
    return [normalize_row(row) for row in result.mappings()]


async def get_active_credential_hash(ctx: IntegrationContext, credential_id: str) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, credentials=True)
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.integration_credentials
            where tenant_id = :tenant_id and id = :credential_id and status = 'active'
              and (expires_at is null or expires_at > now())
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "credential_id": credential_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Aktif credential bulunamadi.", "INTEGRATION_CREDENTIAL_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    return normalize_row(row)


async def find_inbound_signing_credential(ctx: IntegrationContext, app_id: str, credential_id: str | None = None) -> dict[str, Any] | None:
    await ensure_integration_tables(ctx.session, credentials=True)
    if credential_id:
        try:
            return await get_active_credential_hash(ctx, credential_id)
        except DomainError:
            return None
    result = await ctx.session.execute(
        text(
            """
            select *
            from public.integration_credentials
            where tenant_id = :tenant_id
              and integration_app_id = :app_id
              and status = 'active'
              and credential_type in ('webhook_secret','api_key','bearer_token')
              and (expires_at is null or expires_at > now())
            order by created_at desc
            limit 1
            """
        ),
        {"tenant_id": ctx.tenant_id, "app_id": app_id},
    )
    row = result.mappings().one_or_none()
    return normalize_row(row) if row else None


async def revoke_credential(ctx: IntegrationContext, credential_id: str) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, credentials=True)
    result = await ctx.session.execute(
        text(
            """
            update public.integration_credentials
            set status = 'revoked', revoked_by = :user_id, revoked_at = now()
            where tenant_id = :tenant_id and id = :credential_id
            returning id, tenant_id, integration_app_id, credential_type, name, secret_preview,
                      expires_at, last_used_at, status, created_by, created_at, revoked_by, revoked_at
            """
        ),
        {"tenant_id": ctx.tenant_id, "credential_id": credential_id, "user_id": ctx.request_context.user_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Credential bulunamadi.", "INTEGRATION_CREDENTIAL_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    payload = normalize_row(row)
    await record_integration_audit_best_effort(ctx, action_type="credential_revoked", entity_type="integration_credential", entity_id=credential_id)
    return payload


async def rotate_credential(ctx: IntegrationContext, credential_id: str) -> dict[str, Any]:
    await ensure_integration_tables(ctx.session, credentials=True)
    secret = generate_secret()
    result = await ctx.session.execute(
        text(
            """
            update public.integration_credentials
            set secret_hash = :secret_hash,
                secret_preview = :secret_preview,
                status = 'active',
                revoked_by = null,
                revoked_at = null,
                created_at = now(),
                created_by = :user_id
            where tenant_id = :tenant_id and id = :credential_id
            returning id, tenant_id, integration_app_id, credential_type, name, secret_preview,
                      expires_at, last_used_at, status, created_by, created_at, revoked_by, revoked_at
            """
        ),
        {"tenant_id": ctx.tenant_id, "credential_id": credential_id, "secret_hash": hash_secret(secret), "secret_preview": secret_preview(secret), "user_id": ctx.request_context.user_id},
    )
    row = result.mappings().one_or_none()
    if not row:
        raise DomainError("Credential bulunamadi.", "INTEGRATION_CREDENTIAL_NOT_FOUND", status.HTTP_404_NOT_FOUND)
    payload = normalize_row(row)
    payload["secret"] = secret
    await record_integration_audit_best_effort(ctx, action_type="credential_rotated", entity_type="integration_credential", entity_id=credential_id)
    return payload


async def mark_credential_used(ctx: IntegrationContext, credential_id: str) -> None:
    await ctx.session.execute(
        text("update public.integration_credentials set last_used_at = now() where tenant_id = :tenant_id and id = :credential_id"),
        {"tenant_id": ctx.tenant_id, "credential_id": credential_id},
    )
