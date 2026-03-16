import httpx
from app.config import settings


BASE_URL = "https://api.openweathermap.org/data/2.5"


async def get_weather() -> dict:
    if not settings.openweathermap_api_key:
        return _mock_weather()

    params = {
        "lat": settings.weather_lat,
        "lon": settings.weather_lon,
        "appid": settings.openweathermap_api_key,
        "units": "imperial",  # Fahrenheit for US
    }

    try:
        async with httpx.AsyncClient() as client:
            current_resp = await client.get(f"{BASE_URL}/weather", params=params, timeout=10)
            current_resp.raise_for_status()
            current = current_resp.json()

            forecast_resp = await client.get(f"{BASE_URL}/forecast", params=params, timeout=10)
            forecast_resp.raise_for_status()
            forecast = forecast_resp.json()
    except Exception:
        return _mock_weather()

    return {
        "current": {
            "temp": round(current["main"]["temp"]),
            "feels_like": round(current["main"]["feels_like"]),
            "humidity": current["main"]["humidity"],
            "description": current["weather"][0]["description"].title(),
            "icon": current["weather"][0]["icon"],
            "wind_speed": round(current["wind"]["speed"]),
            "city": current["name"],
        },
        "forecast": [
            {
                "dt": item["dt"],
                "temp_min": round(item["main"]["temp_min"]),
                "temp_max": round(item["main"]["temp_max"]),
                "description": item["weather"][0]["description"].title(),
                "icon": item["weather"][0]["icon"],
            }
            for item in forecast["list"][::8][:5]  # Daily snapshots (every 8 x 3h = 24h), 5 days
        ],
        "location": "West Hartford, CT",
    }


def _mock_weather() -> dict:
    return {
        "current": {
            "temp": 42,
            "feels_like": 37,
            "humidity": 65,
            "description": "Partly Cloudy",
            "icon": "02d",
            "wind_speed": 12,
            "city": "West Hartford",
        },
        "forecast": [
            {"dt": 1741996800, "temp_min": 38, "temp_max": 48, "description": "Partly Cloudy", "icon": "02d"},
            {"dt": 1742083200, "temp_min": 35, "temp_max": 44, "description": "Cloudy", "icon": "04d"},
            {"dt": 1742169600, "temp_min": 40, "temp_max": 52, "description": "Light Rain", "icon": "10d"},
            {"dt": 1742256000, "temp_min": 45, "temp_max": 58, "description": "Sunny", "icon": "01d"},
            {"dt": 1742342400, "temp_min": 42, "temp_max": 55, "description": "Mostly Sunny", "icon": "01d"},
        ],
        "location": "West Hartford, CT",
    }
