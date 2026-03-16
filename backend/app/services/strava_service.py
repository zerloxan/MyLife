import httpx
from app.config import settings

BASE_URL = "https://www.strava.com/api/v3"
AUTH_URL = "https://www.strava.com/oauth/authorize"
TOKEN_URL = "https://www.strava.com/oauth/token"

# In-memory token store for development. Production will use DynamoDB.
_token_store: dict = {}


def get_auth_url() -> str:
    return (
        f"{AUTH_URL}?client_id={settings.strava_client_id}"
        f"&redirect_uri={settings.strava_redirect_uri}"
        f"&response_type=code"
        f"&scope=read,activity:read_all,profile:read_all"
    )


async def exchange_token(code: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "client_id": settings.strava_client_id,
            "client_secret": settings.strava_client_secret,
            "code": code,
            "grant_type": "authorization_code",
        })
        resp.raise_for_status()
        tokens = resp.json()
        _token_store["access_token"] = tokens["access_token"]
        _token_store["refresh_token"] = tokens["refresh_token"]
        _token_store["expires_at"] = tokens["expires_at"]
    return {"status": "connected"}


async def _get_valid_token() -> str | None:
    import time
    if not _token_store.get("access_token"):
        return None
    if time.time() > _token_store.get("expires_at", 0):
        await _refresh_token()
    return _token_store.get("access_token")


async def _refresh_token():
    async with httpx.AsyncClient() as client:
        resp = await client.post(TOKEN_URL, data={
            "client_id": settings.strava_client_id,
            "client_secret": settings.strava_client_secret,
            "refresh_token": _token_store.get("refresh_token"),
            "grant_type": "refresh_token",
        })
        resp.raise_for_status()
        tokens = resp.json()
        _token_store["access_token"] = tokens["access_token"]
        _token_store["refresh_token"] = tokens["refresh_token"]
        _token_store["expires_at"] = tokens["expires_at"]


async def get_summary() -> dict:
    token = await _get_valid_token()
    if not token:
        return _mock_summary()

    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        athlete_resp = await client.get(f"{BASE_URL}/athlete", headers=headers, timeout=10)
        athlete_resp.raise_for_status()
        athlete = athlete_resp.json()

        stats_resp = await client.get(f"{BASE_URL}/athletes/{athlete['id']}/stats", headers=headers, timeout=10)
        stats_resp.raise_for_status()
        stats = stats_resp.json()

        activities_resp = await client.get(
            f"{BASE_URL}/athlete/activities",
            headers=headers,
            params={"per_page": 5},
            timeout=10,
        )
        activities_resp.raise_for_status()
        activities = activities_resp.json()

    return {
        "athlete": {"name": f"{athlete['firstname']} {athlete['lastname']}", "profile": athlete.get("profile_medium")},
        "recent_run_totals": {
            "count": stats["recent_run_totals"]["count"],
            "distance_miles": round(stats["recent_run_totals"]["distance"] * 0.000621371, 1),
            "elapsed_time_hours": round(stats["recent_run_totals"]["elapsed_time"] / 3600, 1),
        },
        "ytd_run_totals": {
            "count": stats["ytd_run_totals"]["count"],
            "distance_miles": round(stats["ytd_run_totals"]["distance"] * 0.000621371, 1),
        },
        "recent_activities": [_format_activity(a) for a in activities[:5]],
    }


def _format_activity(a: dict) -> dict:
    return {
        "id": a["id"],
        "name": a["name"],
        "type": a["type"],
        "date": a["start_date_local"],
        "distance_miles": round(a["distance"] * 0.000621371, 2),
        "moving_time_minutes": round(a["moving_time"] / 60),
        "total_elevation_gain_ft": round(a["total_elevation_gain"] * 3.28084),
        "average_heartrate": a.get("average_heartrate"),
        "max_heartrate": a.get("max_heartrate"),
    }


def _mock_summary() -> dict:
    return {
        "athlete": {"name": "Demo User", "profile": None},
        "recent_run_totals": {"count": 4, "distance_miles": 18.3, "elapsed_time_hours": 3.1},
        "ytd_run_totals": {"count": 42, "distance_miles": 187.5},
        "recent_activities": [
            {"id": 1, "name": "Morning Run", "type": "Run", "date": "2026-03-15T07:30:00", "distance_miles": 5.2, "moving_time_minutes": 48, "total_elevation_gain_ft": 124, "average_heartrate": 152, "max_heartrate": 171},
            {"id": 2, "name": "Easy Recovery", "type": "Run", "date": "2026-03-13T06:45:00", "distance_miles": 3.1, "moving_time_minutes": 32, "total_elevation_gain_ft": 65, "average_heartrate": 138, "max_heartrate": 155},
        ],
        "connected": False,
    }
