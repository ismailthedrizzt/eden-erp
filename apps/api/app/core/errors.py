from fastapi import HTTPException


def forbidden(message: str = "Forbidden") -> HTTPException:
    return HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": message})


def conflict(message: str = "Version conflict") -> HTTPException:
    return HTTPException(status_code=409, detail={"code": "VERSION_CONFLICT", "message": message})
