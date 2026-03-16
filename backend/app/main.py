from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from app.routers import soccer, weather, strava

app = FastAPI(title="MyLife API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.amplifyapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(soccer.router)
app.include_router(weather.router)
app.include_router(strava.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Lambda handler
handler = Mangum(app)
