from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> str:
    """
    Stateless auth — validates the JWT and returns the subject (email).
    No database required, so the trading worker/API runs standalone on the VPS.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exc
    try:
        payload = decode_token(token, expected_type="access")
        email = payload.get("sub")
    except ValueError:
        raise credentials_exc
    if not email:
        raise credentials_exc
    return email
