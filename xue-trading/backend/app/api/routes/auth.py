from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.schemas.auth import AccessToken, LoginRequest, RefreshRequest, TokenPair

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest) -> TokenPair:
    """Single-admin auth from env (DASHBOARD_USER / DASHBOARD_PASSWORD). No DB needed."""
    if payload.email == settings.DASHBOARD_USER and payload.password == settings.DASHBOARD_PASSWORD:
        return TokenPair(
            access_token=create_access_token(payload.email),
            refresh_token=create_refresh_token(payload.email),
        )
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")


@router.post("/refresh", response_model=AccessToken)
async def refresh(payload: RefreshRequest) -> AccessToken:
    try:
        data = decode_token(payload.refresh_token, expected_type="refresh")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    return AccessToken(access_token=create_access_token(data["sub"]))


@router.get("/me")
async def me(email: str = Depends(get_current_user)) -> dict:
    return {"email": email}
