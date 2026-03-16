import { StravaData, Activity } from "@/types";

function ActivityRow({ activity }: { activity: Activity }) {
  const date = new Date(activity.date).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-800 last:border-0 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="text-gray-200 font-medium truncate max-w-[180px]">{activity.name}</span>
        <span className="text-gray-500 text-xs">{date} · {activity.type}</span>
      </div>
      <div className="text-right flex flex-col gap-0.5">
        <span className="text-white font-semibold">{activity.distance_miles} mi</span>
        <span className="text-gray-500 text-xs">{activity.moving_time_minutes} min</span>
        {activity.average_heartrate && (
          <span className="text-rose-400 text-xs">{Math.round(activity.average_heartrate)} bpm avg</span>
        )}
      </div>
    </div>
  );
}

export default function StravaWidget({ data }: { data: StravaData }) {
  const { recent_run_totals, ytd_run_totals, recent_activities, connected } = data;
  const isConnected = connected !== false;

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Strava</h2>
        {!isConnected && (
          <a
            href="/api/strava/connect"
            className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded-full font-medium transition"
          >
            Connect
          </a>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">{recent_run_totals.distance_miles}</div>
          <div className="text-xs text-gray-500 mt-0.5">mi this week</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">{recent_run_totals.count}</div>
          <div className="text-xs text-gray-500 mt-0.5">runs this week</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <div className="text-xl font-bold text-white">{ytd_run_totals.distance_miles}</div>
          <div className="text-xs text-gray-500 mt-0.5">mi this year</div>
        </div>
      </div>

      {/* Recent activities */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Recent</div>
        {recent_activities.map((a: Activity) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </div>
    </div>
  );
}
