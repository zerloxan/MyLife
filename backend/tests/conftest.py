import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client with no real HTTP calls."""
    return TestClient(app)


@pytest.fixture
def no_api_keys(monkeypatch):
    """Force all services to return mock data by clearing API keys."""
    monkeypatch.setenv("FOOTBALL_DATA_API_KEY", "")
    monkeypatch.setenv("OPENWEATHERMAP_API_KEY", "")
    monkeypatch.setenv("STRAVA_CLIENT_ID", "")
    monkeypatch.setenv("STRAVA_CLIENT_SECRET", "")


# ── Reusable fake API responses ───────────────────────────────────────────────

FAKE_FOOTBALL_RESPONSE = {
    "matches": [
        {
            "id": 999,
            "homeTeam": {"shortName": "Arsenal"},
            "awayTeam": {"shortName": "Chelsea"},
            "score": {"fullTime": {"home": 2, "away": 1}},
            "status": "FINISHED",
            "minute": None,
            "utcDate": "2026-03-15T17:30:00Z",
        },
        {
            "id": 1000,
            "homeTeam": {"shortName": "Liverpool"},
            "awayTeam": {"shortName": "Man City"},
            "score": {"fullTime": {"home": None, "away": None}},
            "status": "SCHEDULED",
            "minute": None,
            "utcDate": "2026-03-20T15:00:00Z",
        },
    ]
}

FAKE_WEATHER_CURRENT = {
    "main": {"temp": 55.3, "feels_like": 51.0, "humidity": 70},
    "weather": [{"description": "light rain", "icon": "10d"}],
    "wind": {"speed": 8.5},
    "name": "West Hartford",
}

FAKE_WEATHER_FORECAST = {
    "list": [
        {
            "dt": 1742000000 + i * 10800,
            "main": {"temp_min": 40.0 + i, "temp_max": 55.0 + i},
            "weather": [{"description": "cloudy", "icon": "04d"}],
        }
        for i in range(40)  # 40 x 3h entries covers 5 days
    ]
}

FAKE_STRAVA_ATHLETE = {
    "id": 12345,
    "firstname": "Kyle",
    "lastname": "Test",
    "profile_medium": "https://example.com/photo.jpg",
}

FAKE_STRAVA_STATS = {
    "recent_run_totals": {"count": 3, "distance": 24140.0, "elapsed_time": 7200},
    "ytd_run_totals": {"count": 40, "distance": 300000.0},
}

FAKE_STRAVA_ACTIVITIES = [
    {
        "id": 1,
        "name": "Morning Run",
        "type": "Run",
        "start_date_local": "2026-03-15T07:00:00",
        "distance": 8046.7,
        "moving_time": 2700,
        "total_elevation_gain": 50.0,
        "average_heartrate": 148.0,
        "max_heartrate": 165.0,
    }
]
