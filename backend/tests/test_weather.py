import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.weather_service import get_weather, _mock_weather
from tests.conftest import FAKE_WEATHER_CURRENT, FAKE_WEATHER_FORECAST


# ── Unit: mock fallback ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_weather_returns_mock_when_no_api_key(monkeypatch):
    monkeypatch.setattr("app.services.weather_service.settings.openweathermap_api_key", "")
    result = await get_weather()
    assert result == _mock_weather()


@pytest.mark.asyncio
async def test_get_weather_falls_back_to_mock_on_api_error(monkeypatch):
    monkeypatch.setattr("app.services.weather_service.settings.openweathermap_api_key", "fake-key")

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=Exception("network error"))
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        result = await get_weather()

    assert result == _mock_weather()


# ── Unit: live API path ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_weather_parses_api_response(monkeypatch):
    monkeypatch.setattr("app.services.weather_service.settings.openweathermap_api_key", "fake-key")

    current_resp = MagicMock()
    current_resp.raise_for_status = MagicMock()
    current_resp.json.return_value = FAKE_WEATHER_CURRENT

    forecast_resp = MagicMock()
    forecast_resp.raise_for_status = MagicMock()
    forecast_resp.json.return_value = FAKE_WEATHER_FORECAST

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[current_resp, forecast_resp])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        result = await get_weather()

    assert result["current"]["temp"] == 55       # round(55.3)
    assert result["current"]["feels_like"] == 51
    assert result["current"]["humidity"] == 70
    assert result["current"]["description"] == "Light Rain"   # .title()
    assert result["current"]["city"] == "West Hartford"
    assert result["current"]["wind_speed"] == 8              # round(8.5) → banker's rounding
    assert result["location"] == "West Hartford, CT"


@pytest.mark.asyncio
async def test_get_weather_forecast_has_5_days(monkeypatch):
    monkeypatch.setattr("app.services.weather_service.settings.openweathermap_api_key", "fake-key")

    current_resp = MagicMock()
    current_resp.raise_for_status = MagicMock()
    current_resp.json.return_value = FAKE_WEATHER_CURRENT

    forecast_resp = MagicMock()
    forecast_resp.raise_for_status = MagicMock()
    forecast_resp.json.return_value = FAKE_WEATHER_FORECAST

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[current_resp, forecast_resp])
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=mock_client):
        result = await get_weather()

    assert len(result["forecast"]) == 5
    for day in result["forecast"]:
        assert "dt" in day
        assert "temp_min" in day
        assert "temp_max" in day
        assert "icon" in day


# ── Unit: mock data shape ─────────────────────────────────────────────────────

def test_mock_weather_has_required_fields():
    result = _mock_weather()
    assert "current" in result
    assert "forecast" in result
    assert "location" in result
    current = result["current"]
    for field in ("temp", "feels_like", "humidity", "description", "icon", "wind_speed", "city"):
        assert field in current
    assert len(result["forecast"]) == 5


# ── Integration: API endpoint ─────────────────────────────────────────────────

def test_weather_endpoint_returns_200(client, monkeypatch):
    monkeypatch.setattr("app.services.weather_service.settings.openweathermap_api_key", "")
    response = client.get("/api/weather/current")
    assert response.status_code == 200


def test_weather_endpoint_response_shape(client, monkeypatch):
    monkeypatch.setattr("app.services.weather_service.settings.openweathermap_api_key", "")
    data = client.get("/api/weather/current").json()
    assert "current" in data
    assert "forecast" in data
    assert "location" in data
