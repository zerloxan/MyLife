export interface Env {
  STRAVA_CLIENT_ID: string;
  STRAVA_CLIENT_SECRET: string;
  FOOTBALL_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

const TOKEN_URL = "https://www.strava.com/oauth/token";
const FOOTBALL_BASE = "https://api.football-data.org/v4";

function corsHeaders(origin: string, allowedOrigin: string): HeadersInit {
  const allow = origin === allowedOrigin ? origin : allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function exchangeWithStrava(body: Record<string, string>, env: Env): Promise<Response> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      ...body,
    }),
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) return new Response(JSON.stringify({ error: data }), { status: res.status });
  return new Response(
    JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    }),
    { status: 200 }
  );
}

async function proxySoccer(url: URL, env: Env): Promise<Response> {
  // Strip the leading /soccer prefix and forward the rest to football-data.org
  const apiPath = url.pathname.replace(/^\/soccer/, "");
  const apiUrl = `${FOOTBALL_BASE}${apiPath}${url.search}`;
  const res = await fetch(apiUrl, {
    headers: { "X-Auth-Token": env.FOOTBALL_API_KEY },
  });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Soccer proxy (GET)
    if (url.pathname.startsWith("/soccer/")) {
      if (request.method !== "GET") {
        return new Response("Method not allowed", { status: 405, headers: cors });
      }
      const dataRes = await proxySoccer(url, env);
      const body = await dataRes.text();
      return new Response(body, {
        status: dataRes.status,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Strava OAuth (POST)
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: cors });
    }

    let body: Record<string, string>;
    try {
      body = await request.json() as Record<string, string>;
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: cors });
    }

    let dataRes: Response;

    if (url.pathname === "/token") {
      if (!body.code) return new Response("Missing code", { status: 400, headers: cors });
      dataRes = await exchangeWithStrava({ code: body.code, grant_type: "authorization_code" }, env);
    } else if (url.pathname === "/refresh") {
      if (!body.refresh_token) return new Response("Missing refresh_token", { status: 400, headers: cors });
      dataRes = await exchangeWithStrava({ refresh_token: body.refresh_token, grant_type: "refresh_token" }, env);
    } else {
      return new Response("Not found", { status: 404, headers: cors });
    }

    const responseBody = await dataRes.text();
    return new Response(responseBody, {
      status: dataRes.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
