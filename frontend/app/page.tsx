"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import StravaWidget from "@/components/widgets/StravaWidget";
import SoccerClientWrapper from "@/components/widgets/SoccerClientWrapper";
import WeatherSkeleton from "@/components/skeletons/WeatherSkeleton";
import SoccerSkeleton from "@/components/skeletons/SoccerSkeleton";
import StravaSkeleton from "@/components/skeletons/StravaSkeleton";
import type { WeatherData, SoccerData, StravaData } from "@/types";

type State<T> = { data: T | null; error: boolean };

function useWidget<T>(fetcher: () => Promise<T>): State<T> & { loading: boolean } {
  const [state, setState] = useState<State<T>>({ data: null, error: false });

  useEffect(() => {
    fetcher()
      .then((data) => setState({ data, error: false }))
      .catch(() => setState({ data: null, error: true }));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, loading: state.data === null && !state.error };
}

export default function Dashboard() {
  const weather = useWidget<WeatherData>(api.weather);
  const soccer  = useWidget<SoccerData>(api.soccer);
  const strava  = useWidget<StravaData>(api.strava);

  const now = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">MyLife</h1>
        <p className="text-gray-500 mt-1">{now}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          {weather.loading ? <WeatherSkeleton /> :
           weather.error   ? <ErrorCard title="Weather" /> :
           <WeatherWidget data={weather.data!} />}
        </div>

        {soccer.loading ? <SoccerSkeleton /> :
         soccer.error   ? <ErrorCard title="Soccer" /> :
         <SoccerClientWrapper initialData={soccer.data!} />}

        {strava.loading ? <StravaSkeleton /> :
         strava.error   ? <ErrorCard title="Strava" /> :
         <StravaWidget data={strava.data!} />}
      </div>
    </main>
  );
}

function ErrorCard({ title }: { title: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
      <p className="text-gray-500 text-sm">Unable to load data. Check that the API is running.</p>
    </div>
  );
}
