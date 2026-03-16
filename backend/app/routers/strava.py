from fastapi import APIRouter
from app.services.strava_service import get_summary, get_auth_url, exchange_token

router = APIRouter(prefix="/api/strava", tags=["strava"])


@router.get("/summary")
async def summary():
    return await get_summary()


@router.get("/connect")
async def connect():
    """Redirect URL for Strava OAuth flow."""
    url = get_auth_url()
    return {"auth_url": url}


@router.get("/callback")
async def callback(code: str, state: str = ""):
    """Handle Strava OAuth callback and store tokens."""
    return await exchange_token(code)
