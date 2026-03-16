import { Suspense } from "react";
import { api } from "@/lib/api";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import StravaWidget from "@/components/widgets/StravaWidget";
import SoccerClientWrapper from "@/components/widgets/SoccerClientWrapper";
import WeatherSkeleton from "@/components/skeletons/WeatherSkeleton";
import SoccerSkeleton from "@/components/skeletons/SoccerSkeleton";
import StravaSkeleton from "@/components/skeletons/StravaSkeleton";

// Each of these async components fetches independently —
// a slow/failing widget won't block the rest of the page.

async function WeatherSection() {
  try {
    const data = await api.weather();
    return <WeatherWidget data={data} />;
  } catch {
    return <ErrorCard title="Weather" />;
  }
}

async function StravaSection() {
  try {
    const data = await api.strava();
    return <StravaWidget data={data} />;
  } catch {
    return <ErrorCard title="Strava" />;
  }
}

async function SoccerSection() {
  try {
    const data = await api.soccer();
    return <SoccerClientWrapper initialData={data} />;
  } catch {
    return <ErrorCard title="Soccer" />;
  }
}

export default function Dashboard() {
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
          <Suspense fallback={<WeatherSkeleton />}>
            <WeatherSection />
          </Suspense>
        </div>

        <Suspense fallback={<SoccerSkeleton />}>
          <SoccerSection />
        </Suspense>

        <Suspense fallback={<StravaSkeleton />}>
          <StravaSection />
        </Suspense>
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
