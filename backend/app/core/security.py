from dataclasses import dataclass

from fastapi import Header, HTTPException, status


@dataclass(frozen=True)
class RequestContext:
    tenant_id: str | None
    user_id: str | None
    company_scope: str | None = None


async def get_request_context(
    x_tenant_id: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
    x_company_scope: str | None = Header(default=None),
) -> RequestContext:
    return RequestContext(tenant_id=x_tenant_id, user_id=x_user_id, company_scope=x_company_scope)


def require_tenant(context: RequestContext) -> str:
    if not context.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "Çalışma alanı bilgisi alınamadı.",
                "code": "WORKSPACE_CONTEXT_REQUIRED",
                "message": "Çalışma alanı bilgisi alınamadı.",
            },
        )
    return context.tenant_id
