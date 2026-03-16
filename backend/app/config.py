from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Soccer
    football_data_api_key: str = ""
    football_leagues: list[str] = ["PL", "PD", "SA", "BL1", "CL"]  # Premier League, La Liga, Serie A, Bundesliga, Champions League

    # Weather
    openweathermap_api_key: str = ""
    weather_lat: float = 41.7620  # West Hartford, CT
    weather_lon: float = -72.7396

    # Strava
    strava_client_id: str = ""
    strava_client_secret: str = ""
    strava_redirect_uri: str = "http://localhost:8000/api/strava/callback"

    # AWS
    dynamodb_table_name: str = "mylife"
    aws_region: str = "us-east-1"

    # App
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
