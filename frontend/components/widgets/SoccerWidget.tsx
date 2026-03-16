import { SoccerData, Match, LeagueScores } from "@/types";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  IN_PLAY: { label: "LIVE", className: "bg-green-500 text-white" },
  PAUSED:  { label: "HT",   className: "bg-yellow-500 text-black" },
  FINISHED:{ label: "FT",   className: "bg-gray-700 text-gray-300" },
  SCHEDULED:{ label: "–",   className: "bg-gray-800 text-gray-400" },
};

function MatchRow({ match }: { match: Match }) {
  const badge = STATUS_BADGE[match.status] ?? { label: match.status, className: "bg-gray-800 text-gray-400" };
  const kickoff = match.status === "SCHEDULED"
    ? new Date(match.utc_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex items-center justify-between py-2 px-1 border-b border-gray-800 last:border-0 text-sm">
      <span className="w-36 text-gray-200 truncate">{match.home}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {match.status === "SCHEDULED" ? (
          <span className="text-gray-500 text-xs w-16 text-center">{kickoff}</span>
        ) : (
          <span className="font-bold text-white w-12 text-center">
            {match.home_score ?? "–"} – {match.away_score ?? "–"}
          </span>
        )}
        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold w-10 text-center ${badge.className}`}>
          {match.status === "IN_PLAY" && match.minute ? `${match.minute}'` : badge.label}
        </span>
      </div>
      <span className="w-36 text-gray-200 truncate text-right">{match.away}</span>
    </div>
  );
}

export default function SoccerWidget({ data }: { data: SoccerData }) {
  const activeLeagues = data.leagues.filter((l: LeagueScores) => l.matches.length > 0);

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-gray-200">Soccer</h2>

      {activeLeagues.length === 0 ? (
        <p className="text-gray-500 text-sm">No matches today.</p>
      ) : (
        activeLeagues.map((league: LeagueScores) => (
          <div key={league.code}>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {league.league}
            </div>
            {league.matches.map((m: Match) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        ))
      )}
    </div>
  );
}
