from pydantic import BaseModel


class PlaceholderResponse(BaseModel):
    status: str
    module: str
    message: str
