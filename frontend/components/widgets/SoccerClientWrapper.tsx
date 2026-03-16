"use client";

import { useEffect, useState, useCallback } from "react";
import SoccerWidget from "./SoccerWidget";
import type { SoccerData } from "@/types";

const POLL_INTERVAL = 60_000; // 60 seconds

export default function SoccerClientWrapper({ initialData }: { initialData: SoccerData }) {
  const [data, setData] = useState<SoccerData>(initialData);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/soccer/scores", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
        setLastUpdated(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-poll
  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refresh]);

  const timeAgo = Math.round((Date.now() - lastUpdated.getTime()) / 1000);
  const updatedLabel = timeAgo < 10 ? "just now" : `${timeAgo}s ago`;

  return (
    <div className="relative">
      <SoccerWidget data={data} />
      <div className="absolute top-5 right-6 flex items-center gap-2">
        <span className="text-xs text-gray-600">{updatedLabel}</span>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-gray-600 hover:text-gray-400 transition disabled:opacity-40"
          title="Refresh scores"
        >
          {/* Refresh icon */}
          <svg
            className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
