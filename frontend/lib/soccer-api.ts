import type { SoccerData } from "@/types";

interface FootballMatch {
  id: number;
  homeTeam?: { shortName?: string };
  awayTeam?: { shortName?: string };
  score?: { fullTime?: { home?: number | null; away?: number | null } };
  status: string;
  minute?: number | null;
  utcDate: string;
}

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

function getWorkerBase(): string {
  const url = process.env.NEXT_PUBLIC_STRAVA_WORKER_URL;
  if (!url) throw new Error("NEXT_PUBLIC_STRAVA_WORKER_URL is not set");
  return url.replace(/\/$/, "");
}

export async function getSoccerScores(): Promise<SoccerData> {
  const workerBase = getWorkerBase();
  const dateFrom = formatDate(-3);
  const dateTo = formatDate(7);

  const results = await Promise.all(
    LEAGUES.map(async (code) => {
      try {
        const res = await fetch(
          `${workerBase}/soccer/competitions/${code}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
        );
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        return {
          league: LEAGUE_NAMES[code] ?? code,
          code,
          matches: (data.matches as FootballMatch[] ?? []).map((m: FootballMatch) => ({
            id: m.id,
            home: m.homeTeam?.shortName ?? "Unknown",
            away: m.awayTeam?.shortName ?? "Unknown",
            home_score: m.score?.fullTime?.home ?? null,
            away_score: m.score?.fullTime?.away ?? null,
            status: m.status as import("@/types").Match["status"],
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
