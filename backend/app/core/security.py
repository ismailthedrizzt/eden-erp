from dataclasses import dataclass

from fastapi import Header, HTTPException, status


@dataclass(frozen=True)
class RequestContext:
    tenant_id: str | None
    user_id: str | None


async def get_request_context(
    x_tenant_id: str | None = Header(default=None),
    x_user_id: str | None = Header(default=None),
) -> RequestContext:
    return RequestContext(tenant_id=x_tenant_id, user_id=x_user_id)


def require_tenant(context: RequestContext) -> str:
    if not context.tenant_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Workspace context is required.")
    return context.tenant_id
