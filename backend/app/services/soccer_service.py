import httpx
from datetime import date, timedelta
from app.config import settings


LEAGUE_NAMES = {
    "PL": "Premier League",
    "PD": "La Liga",
    "SA": "Serie A",
    "BL1": "Bundesliga",
    "CL": "Champions League",
}

BASE_URL = "https://api.football-data.org/v4"


async def get_scores() -> dict:
    if not settings.football_data_api_key:
        return _mock_scores()

    results = []
    headers = {"X-Auth-Token": settings.football_data_api_key}

    # Show matches from 3 days ago through 7 days ahead
    date_from = (date.today() - timedelta(days=3)).isoformat()
    date_to = (date.today() + timedelta(days=7)).isoformat()

    async with httpx.AsyncClient() as client:
        for league_code in settings.football_leagues:
            try:
                resp = await client.get(
                    f"{BASE_URL}/competitions/{league_code}/matches",
                    headers=headers,
                    params={"dateFrom": date_from, "dateTo": date_to},
                    timeout=10,
                )
                resp.raise_for_status()
                data = resp.json()
                matches = [_format_match(m) for m in data.get("matches", [])]
                results.append({
                    "league": LEAGUE_NAMES.get(league_code, league_code),
                    "code": league_code,
                    "matches": matches,
                })
            except Exception:
                results.append({
                    "league": LEAGUE_NAMES.get(league_code, league_code),
                    "code": league_code,
                    "matches": [],
                    "error": "Failed to fetch",
                })

    return {"leagues": results}


def _format_match(m: dict) -> dict:
    return {
        "id": m.get("id"),
        "home": m.get("homeTeam", {}).get("shortName", "Unknown"),
        "away": m.get("awayTeam", {}).get("shortName", "Unknown"),
        "home_score": m.get("score", {}).get("fullTime", {}).get("home"),
        "away_score": m.get("score", {}).get("fullTime", {}).get("away"),
        "status": m.get("status"),
        "minute": m.get("minute"),
        "utc_date": m.get("utcDate"),
    }


def _mock_scores() -> dict:
    return {
        "leagues": [
            {
                "league": "Premier League",
                "code": "PL",
                "matches": [
                    {"id": 1, "home": "Arsenal", "away": "Chelsea", "home_score": 2, "away_score": 1, "status": "FINISHED", "minute": None, "utc_date": "2026-03-15T17:30:00Z"},
                    {"id": 2, "home": "Man City", "away": "Liverpool", "home_score": None, "away_score": None, "status": "SCHEDULED", "minute": None, "utc_date": "2026-03-16T16:00:00Z"},
                ],
            },
            {
                "league": "La Liga",
                "code": "PD",
                "matches": [
                    {"id": 3, "home": "Real Madrid", "away": "Barcelona", "home_score": 1, "away_score": 1, "status": "IN_PLAY", "minute": 67, "utc_date": "2026-03-16T19:00:00Z"},
                ],
            },
            {"league": "Serie A", "code": "SA", "matches": []},
            {"league": "Bundesliga", "code": "BL1", "matches": []},
            {"league": "Champions League", "code": "CL", "matches": []},
        ]
    }
