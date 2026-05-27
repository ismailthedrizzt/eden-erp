from fastapi import APIRouter

from app.schemas.placeholder import PlaceholderResponse

router = APIRouter()


@router.get("", response_model=PlaceholderResponse)
async def list_branches() -> PlaceholderResponse:
    return PlaceholderResponse(
        status="planned",
        module="branches",
        message="Branch opening and closing are the first FastAPI migration targets.",
    )
