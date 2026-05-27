from fastapi import APIRouter

from app.schemas.placeholder import PlaceholderResponse

router = APIRouter()


@router.get("", response_model=PlaceholderResponse)
async def list_representatives() -> PlaceholderResponse:
    return PlaceholderResponse(
        status="planned",
        module="representatives",
        message="Representative authority scope endpoints will migrate to FastAPI.",
    )
