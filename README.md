# MyLife

A personal dashboard aggregating soccer scores, weather, and fitness data in one place.

## Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS → AWS Amplify
- **Backend**: Python / FastAPI → AWS Lambda + API Gateway
- **Auth**: AWS Cognito
- **Database**: DynamoDB (Strava OAuth tokens)
- **IaC**: Terraform

## Features

- Soccer scores: Premier League, La Liga, Serie A, Bundesliga, Champions League
- Weather: West Hartford, CT (current + 5-day forecast)
- Strava: recent runs, weekly/YTD stats

## Local Development

### Backend

```bash
cd backend
cp .env.example .env  # fill in your API keys
pip install -r requirements.txt
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

Both services run without API keys — mock data is returned automatically when keys are absent.

## API Keys Needed

| Service | Where to Get |
|---|---|
| `FOOTBALL_DATA_API_KEY` | football-data.org — free tier |
| `OPENWEATHERMAP_API_KEY` | openweathermap.org — free tier |
| `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` | strava.com/settings/api — free |

## Project Structure

```
MyLife/
  frontend/          # Next.js app
  backend/           # FastAPI app (deploys to Lambda)
  infrastructure/    # Terraform (Phase 3)
  .github/workflows/ # CI/CD (Phase 4)
```
