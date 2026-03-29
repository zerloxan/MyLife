import type { SoccerData } from "@/types";

const BASE_URL = "https://api.football-data.org/v4";

const LEAGUE_NAMES: Record<string, string> = {
  PL: "Premier League",
  PD: "La Liga",
  SA: "Serie A",
  BL1: "Bundesliga",
  CL: "Champions League",
};

const LEAGUES = ["PL", "PD", "SA", "BL1", "CL"];

function formatDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

export async function getSoccerScores(): Promise<SoccerData> {
  const key = process.env.NEXT_PUBLIC_FOOTBALL_API_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_FOOTBALL_API_KEY is not set");

  const dateFrom = formatDate(-3);
  const dateTo = formatDate(7);
  const headers = { "X-Auth-Token": key };

  const results = await Promise.all(
    LEAGUES.map(async (code) => {
      try {
        const res = await fetch(
          `${BASE_URL}/competitions/${code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
          { headers }
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        return {
          league: LEAGUE_NAMES[code] ?? code,
          code,
          matches: (data.matches ?? []).map((m: any) => ({
            id: m.id,
            home: m.homeTeam?.shortName ?? "Unknown",
            away: m.awayTeam?.shortName ?? "Unknown",
            home_score: m.score?.fullTime?.home ?? null,
            away_score: m.score?.fullTime?.away ?? null,
            status: m.status,
            minute: m.minute ?? null,
            utc_date: m.utcDate,
          })),
        };
      } catch {
        return { league: LEAGUE_NAMES[code] ?? code, code, matches: [], error: "Failed to fetch" };
      }
    })
  );

  return { leagues: results };
}
