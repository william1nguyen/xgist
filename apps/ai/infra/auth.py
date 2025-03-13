import os
from fastapi import HTTPException, Security
from fastapi.security import api_key
from starlette import status

x_api_key_header = api_key.APIKeyHeader(name="x-api-key")


async def validate_x_api_key(key: str = Security(x_api_key_header)):
    if key != os.getenv("X_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized - x_api_key is wrong"
        )
    return None