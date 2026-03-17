import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.soccer_service import get_scores, _format_match, _mock_scores


# ── Unit: _format_match ───────────────────────────────────────────────────────

def test_format_match_finished():
    raw = {
        "id": 1,
        "homeTeam": {"shortName": "Arsenal"},
        "awayTeam": {"shortName": "Chelsea"},
        "score": {"fullTime": {"home": 2, "away": 1}},
        "status": "FINISHED",
        "minute": None,
        "utcDate": "2026-03-15T17:30:00Z",
    }
    result = _format_match(raw)
    assert result["home"] == "Arsenal"
    assert result["away"] == "Chelsea"
    assert result["home_score"] == 2
    assert result["away_score"] == 1
    assert result["status"] == "FINISHED"


def test_format_match_in_play():
    raw = {
        "id": 2,
        "homeTeam": {"shortName": "Real Madrid"},
        "awayTeam": {"shortName": "Barcelona"},
        "score": {"fullTime": {"home": 1, "away": 0}},
        "status": "IN_PLAY",
        "minute": 67,
        "utcDate": "2026-03-16T19:00:00Z",
    }
    result = _format_match(raw)
    assert result["status"] == "IN_PLAY"
    assert result["minute"] == 67


def test_format_match_missing_teams():
    """Falls back to 'Unknown' when team data is absent."""
    result = _format_match({"id": 3, "score": {"fullTime": {}}, "status": "SCHEDULED"})
    assert result["home"] == "Unknown"
    assert result["away"] == "Unknown"
    assert result["home_score"] is None


def test_format_match_scheduled_no_score():
    raw = {
        "id": 4,
        "homeTeam": {"shortName": "Liverpool"},
        "awayTeam": {"shortName": "Man City"},
        "score": {"fullTime": {"home": None, "away": None}},
        "status": "SCHEDULED",
        "minute": None,
        "utcDate": "2026-03-20T15:00:00Z",
    }
    result = _format_match(raw)
    assert result["home_score"] is None
    assert result["away_score"] is None


# ── Unit: mock fallback ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_scores_returns_mock_when_no_api_key(monkeypatch):
    monkeypatch.setattr("app.services.soccer_service.settings.football_data_api_key", "")
    result = await get_scores()
    assert "leagues" in result
    assert len(result["leagues"]) == 5
    league_names = [l["league"] for l in result["leagues"]]
    assert "Premier League" in league_names
    assert "La Liga" in league_names


# ── Unit: live API path ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_scores_fetches_all_leagues(monkeypatch):
    monkeypatch.setattr("app.services.soccer_service.settings.football_data_api_key", "fake-key")
    monkeypatch.setattr("app.services.soccer_service.settings.football_leagues", ["PL", "PD"])

    fake_response = MagicMock()
    fake_response.raise_for_status = MagicMock()
    fake_response.json.return_value = {
        "matches": [
            {
                "id": 1,
                "homeTeam": {"shortName": "Arsenal"},
                "awayTeam": {"shortName": "Chelsea"},
                "score": {"fullTime": {"home": 2, "away": 1}},
                "status": "FINISHED",
                "minute": None,
                "utcDate": "2026-03-15T17:30:00Z",
            }
        ]
    }

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=fake_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.soccer_service.httpx.AsyncClient", return_value=mock_client):
        result = await get_scores()

    assert len(result["leagues"]) == 2
    assert result["leagues"][0]["league"] == "Premier League"
    assert result["leagues"][0]["matches"][0]["home"] == "Arsenal"


@pytest.mark.asyncio
async def test_get_scores_handles_api_error_gracefully(monkeypatch):
    """A failing league returns an error entry instead of crashing."""
    monkeypatch.setattr("app.services.soccer_service.settings.football_data_api_key", "fake-key")
    monkeypatch.setattr("app.services.soccer_service.settings.football_leagues", ["PL"])

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=httpx.ConnectError("timeout"))
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.soccer_service.httpx.AsyncClient", return_value=mock_client):
        result = await get_scores()

    assert result["leagues"][0]["matches"] == []
    assert result["leagues"][0]["error"] == "Failed to fetch"


# ── Integration: API endpoint ─────────────────────────────────────────────────

def test_soccer_endpoint_returns_200(client, monkeypatch):
    monkeypatch.setattr("app.services.soccer_service.settings.football_data_api_key", "")
    response = client.get("/api/soccer/scores")
    assert response.status_code == 200


def test_soccer_endpoint_response_shape(client, monkeypatch):
    monkeypatch.setattr("app.services.soccer_service.settings.football_data_api_key", "")
    data = client.get("/api/soccer/scores").json()
    assert "leagues" in data
    for league in data["leagues"]:
        assert "league" in league
        assert "code" in league
        assert "matches" in league
        assert isinstance(league["matches"], list)
