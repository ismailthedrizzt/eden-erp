from fastapi import APIRouter

from app.schemas.placeholder import PlaceholderResponse

router = APIRouter()


@router.get("", response_model=PlaceholderResponse)
async def list_companies() -> PlaceholderResponse:
    return PlaceholderResponse(
        status="planned",
        module="companies",
        message="Company endpoints will migrate from Next.js BFF routes to FastAPI.",
    )
