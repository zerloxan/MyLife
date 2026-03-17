import time
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services import strava_service
from app.services.strava_service import (
    get_auth_url,
    get_summary,
    exchange_token,
    _format_activity,
    _mock_summary,
)
from tests.conftest import FAKE_STRAVA_ATHLETE, FAKE_STRAVA_STATS, FAKE_STRAVA_ACTIVITIES


@pytest.fixture(autouse=True)
def clear_token_store():
    """Reset the in-memory token store before every test."""
    strava_service._token_store.clear()
    yield
    strava_service._token_store.clear()


# ── Unit: get_auth_url ────────────────────────────────────────────────────────

def test_get_auth_url_contains_client_id(monkeypatch):
    monkeypatch.setattr("app.services.strava_service.settings.strava_client_id", "my-client-id")
    url = get_auth_url()
    assert "client_id=my-client-id" in url
    assert "response_type=code" in url
    assert "activity:read_all" in url


def test_get_auth_url_contains_redirect_uri(monkeypatch):
    monkeypatch.setattr("app.services.strava_service.settings.strava_client_id", "abc")
    monkeypatch.setattr("app.services.strava_service.settings.strava_redirect_uri", "http://localhost:8000/callback")
    url = get_auth_url()
    assert "redirect_uri=http://localhost:8000/callback" in url


# ── Unit: _format_activity ────────────────────────────────────────────────────

def test_format_activity_converts_units():
    raw = FAKE_STRAVA_ACTIVITIES[0]
    result = _format_activity(raw)
    assert result["distance_miles"] == round(8046.7 * 0.000621371, 2)
    assert result["moving_time_minutes"] == round(2700 / 60)
    assert result["total_elevation_gain_ft"] == round(50.0 * 3.28084)


def test_format_activity_includes_heartrate():
    raw = FAKE_STRAVA_ACTIVITIES[0]
    result = _format_activity(raw)
    assert result["average_heartrate"] == 148.0
    assert result["max_heartrate"] == 165.0


def test_format_activity_heartrate_optional():
    raw = {**FAKE_STRAVA_ACTIVITIES[0]}
    del raw["average_heartrate"]
    del raw["max_heartrate"]
    result = _format_activity(raw)
    assert result["average_heartrate"] is None
    assert result["max_heartrate"] is None


# ── Unit: mock fallback ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_summary_returns_mock_when_no_token():
    result = await get_summary()
    assert result == _mock_summary()


@pytest.mark.asyncio
async def test_get_summary_returns_mock_when_token_expired():
    strava_service._token_store["access_token"] = "old-token"
    strava_service._token_store["refresh_token"] = "old-refresh"
    strava_service._token_store["expires_at"] = time.time() - 3600  # expired 1 hour ago

    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "access_token": "new-token",
        "refresh_token": "new-refresh",
        "expires_at": time.time() + 3600,
    }
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_resp)
    mock_client.get = AsyncMock(side_effect=[
        MagicMock(raise_for_status=MagicMock(), json=MagicMock(return_value=FAKE_STRAVA_ATHLETE)),
        MagicMock(raise_for_status=MagicMock(), json=MagicMock(return_value=FAKE_STRAVA_STATS)),
        MagicMock(raise_for_status=MagicMock(), json=MagicMock(return_value=FAKE_STRAVA_ACTIVITIES)),
    ])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.strava_service.httpx.AsyncClient", return_value=mock_client):
        result = await get_summary()

    assert result["athlete"]["name"] == "Kyle Test"
    assert strava_service._token_store["access_token"] == "new-token"


# ── Unit: live API path ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_summary_parses_api_response():
    strava_service._token_store["access_token"] = "valid-token"
    strava_service._token_store["expires_at"] = time.time() + 3600

    athlete_resp = MagicMock(raise_for_status=MagicMock(), json=MagicMock(return_value=FAKE_STRAVA_ATHLETE))
    stats_resp = MagicMock(raise_for_status=MagicMock(), json=MagicMock(return_value=FAKE_STRAVA_STATS))
    activities_resp = MagicMock(raise_for_status=MagicMock(), json=MagicMock(return_value=FAKE_STRAVA_ACTIVITIES))

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[athlete_resp, stats_resp, activities_resp])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.strava_service.httpx.AsyncClient", return_value=mock_client):
        result = await get_summary()

    assert result["athlete"]["name"] == "Kyle Test"
    assert result["recent_run_totals"]["count"] == 3
    assert result["recent_run_totals"]["distance_miles"] == round(24140.0 * 0.000621371, 1)
    assert result["ytd_run_totals"]["count"] == 40
    assert len(result["recent_activities"]) == 1
    assert result["recent_activities"][0]["name"] == "Morning Run"


@pytest.mark.asyncio
async def test_exchange_token_stores_tokens():
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json.return_value = {
        "access_token": "abc123",
        "refresh_token": "refresh456",
        "expires_at": 9999999999,
    }
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.strava_service.httpx.AsyncClient", return_value=mock_client):
        result = await exchange_token("auth-code")

    assert result == {"status": "connected"}
    assert strava_service._token_store["access_token"] == "abc123"
    assert strava_service._token_store["refresh_token"] == "refresh456"


# ── Integration: API endpoints ────────────────────────────────────────────────

def test_strava_summary_endpoint_returns_200(client):
    response = client.get("/api/strava/summary")
    assert response.status_code == 200


def test_strava_connect_endpoint_returns_auth_url(client, monkeypatch):
    monkeypatch.setattr("app.services.strava_service.settings.strava_client_id", "test-id")
    data = client.get("/api/strava/connect").json()
    assert "auth_url" in data
    assert "test-id" in data["auth_url"]


def test_strava_summary_shape(client):
    data = client.get("/api/strava/summary").json()
    assert "athlete" in data
    assert "recent_run_totals" in data
    assert "ytd_run_totals" in data
    assert "recent_activities" in data
