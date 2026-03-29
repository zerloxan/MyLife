import type { StravaData } from "@/types";

const STRAVA_BASE = "https://www.strava.com/api/v3";
const TOKEN_KEY = "strava_access_token";
const REFRESH_KEY = "strava_refresh_token";
const EXPIRES_KEY = "strava_expires_at";

function getWorkerUrl(): string {
  const url = process.env.NEXT_PUBLIC_STRAVA_WORKER_URL;
  if (!url) throw new Error("NEXT_PUBLIC_STRAVA_WORKER_URL is not set");
  return url.replace(/\/$/, "");
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

// ── Token storage ──────────────────────────────────────────────────────────

function saveTokens(tokens: { access_token: string; refresh_token: string; expires_at: number }) {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  localStorage.setItem(EXPIRES_KEY, String(tokens.expires_at));
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRES_KEY);
}

async function getValidToken(): Promise<string | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(localStorage.getItem(EXPIRES_KEY) ?? 0);
  if (!token) return null;

  // Refresh if within 5 minutes of expiry
  if (Date.now() / 1000 > expiresAt - 300) {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) { clearTokens(); return null; }
    try {
      const res = await fetch(`${getWorkerUrl()}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) { clearTokens(); return null; }
      const tokens = await res.json();
      saveTokens(tokens);
      return tokens.access_token;
    } catch {
      clearTokens();
      return null;
    }
  }

  return token;
}

// ── OAuth flow ─────────────────────────────────────────────────────────────

export function initiateOAuth() {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_STRAVA_CLIENT_ID is not set");
  const redirectUri = encodeURIComponent(getAppUrl());
  window.location.href =
    `https://www.strava.com/oauth/authorize?client_id=${clientId}` +
    `&redirect_uri=${redirectUri}&response_type=code` +
    `&scope=read,activity:read_all,profile:read_all`;
}

export async function handleOAuthCallback(code: string): Promise<void> {
  const res = await fetch(`${getWorkerUrl()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error("Token exchange failed");
  const tokens = await res.json();
  saveTokens(tokens);
}

export function isStravaConnected(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}

// ── Data fetching ──────────────────────────────────────────────────────────

export async function getStravaData(): Promise<StravaData> {
  const token = await getValidToken();
  if (!token) {
    return {
      athlete: { name: "", profile: null },
      recent_run_totals: { count: 0, distance_miles: 0, elapsed_time_hours: 0 },
      ytd_run_totals: { count: 0, distance_miles: 0 },
      recent_activities: [],
      connected: false,
    };
  }

  const headers = { Authorization: `Bearer ${token}` };

  const athleteRes = await fetch(`${STRAVA_BASE}/athlete`, { headers });
  if (!athleteRes.ok) { clearTokens(); throw new Error("Strava auth error"); }
  const athlete = await athleteRes.json();

  const [statsRes, activitiesRes] = await Promise.all([
    fetch(`${STRAVA_BASE}/athletes/${athlete.id}/stats`, { headers }),
    fetch(`${STRAVA_BASE}/athlete/activities?per_page=5`, { headers }),
  ]);

  if (!statsRes.ok || !activitiesRes.ok) throw new Error("Strava API error");

  const stats = await statsRes.json();
  const activities = await activitiesRes.json();

  return {
    athlete: {
      name: `${athlete.firstname} ${athlete.lastname}`,
      profile: athlete.profile_medium ?? null,
    },
    recent_run_totals: {
      count: stats.recent_run_totals.count,
      distance_miles: Math.round(stats.recent_run_totals.distance * 0.000621371 * 10) / 10,
      elapsed_time_hours: Math.round(stats.recent_run_totals.elapsed_time / 3600 * 10) / 10,
    },
    ytd_run_totals: {
      count: stats.ytd_run_totals.count,
      distance_miles: Math.round(stats.ytd_run_totals.distance * 0.000621371 * 10) / 10,
    },
    recent_activities: activities.slice(0, 5).map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      date: a.start_date_local,
      distance_miles: Math.round(a.distance * 0.000621371 * 100) / 100,
      moving_time_minutes: Math.round(a.moving_time / 60),
      total_elevation_gain_ft: Math.round(a.total_elevation_gain * 3.28084),
      average_heartrate: a.average_heartrate ?? null,
      max_heartrate: a.max_heartrate ?? null,
    })),
    connected: true,
  };
}
