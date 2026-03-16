const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  soccer: () => apiFetch<import("@/types").SoccerData>("/api/soccer/scores"),
  weather: () => apiFetch<import("@/types").WeatherData>("/api/weather/current"),
  strava: () => apiFetch<import("@/types").StravaData>("/api/strava/summary"),
};
