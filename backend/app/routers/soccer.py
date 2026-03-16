from fastapi import APIRouter
from app.services.soccer_service import get_scores

router = APIRouter(prefix="/api/soccer", tags=["soccer"])


@router.get("/scores")
async def scores():
    return await get_scores()
