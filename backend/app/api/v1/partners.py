from fastapi import APIRouter

from app.schemas.placeholder import PlaceholderResponse

router = APIRouter()


@router.get("", response_model=PlaceholderResponse)
async def list_partners() -> PlaceholderResponse:
    return PlaceholderResponse(
        status="planned",
        module="partners",
        message="Ownership and partner endpoints will migrate after critical operations.",
    )
