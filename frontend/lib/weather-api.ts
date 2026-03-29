import type { WeatherData } from "@/types";

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const LAT = 41.762;
const LON = -72.7396;

export async function getWeather(): Promise<WeatherData> {
  const key = process.env.NEXT_PUBLIC_OWM_API_KEY;
  if (!key) throw new Error("NEXT_PUBLIC_OWM_API_KEY is not set");

  const params = new URLSearchParams({
    lat: String(LAT),
    lon: String(LON),
    appid: key,
    units: "imperial",
  });

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`${BASE_URL}/weather?${params}`),
    fetch(`${BASE_URL}/forecast?${params}`),
  ]);

  if (!currentRes.ok || !forecastRes.ok) throw new Error("Weather API error");

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  return {
    current: {
      temp: Math.round(current.main.temp),
      feels_like: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      description: current.weather[0].description
        .split(" ")
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      icon: current.weather[0].icon,
      wind_speed: Math.round(current.wind.speed),
      city: current.name,
    },
    forecast: (forecast.list as any[])
      .filter((_: any, i: number) => i % 8 === 0)
      .slice(0, 5)
      .map((item: any) => ({
        dt: item.dt,
        temp_min: Math.round(item.main.temp_min),
        temp_max: Math.round(item.main.temp_max),
        description: item.weather[0].description
          .split(" ")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        icon: item.weather[0].icon,
      })),
    location: "West Hartford, CT",
  };
}
