import { WeatherData, ForecastDay } from "@/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function iconUrl(icon: string) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function dayName(dt: number) {
  return DAYS[new Date(dt * 1000).getDay()];
}

export default function WeatherWidget({ data }: { data: WeatherData }) {
  const { current, forecast, location } = data;

  return (
    <div className="bg-gray-900 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-200">Weather</h2>
        <span className="text-sm text-gray-500">{location}</span>
      </div>

      {/* Current */}
      <div className="flex items-center gap-4">
        <img src={iconUrl(current.icon)} alt={current.description} className="w-16 h-16" />
        <div>
          <div className="text-5xl font-bold text-white">{current.temp}°F</div>
          <div className="text-gray-400 text-sm mt-1">{current.description}</div>
        </div>
        <div className="ml-auto text-right text-sm text-gray-400 space-y-1">
          <div>Feels like {current.feels_like}°F</div>
          <div>Humidity {current.humidity}%</div>
          <div>Wind {current.wind_speed} mph</div>
        </div>
      </div>

      {/* Forecast strip */}
      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-gray-800">
        {forecast.map((day: ForecastDay) => (
          <div key={day.dt} className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-500">{dayName(day.dt)}</span>
            <img src={iconUrl(day.icon)} alt={day.description} className="w-8 h-8" />
            <span className="text-xs font-medium text-white">{day.temp_max}°</span>
            <span className="text-xs text-gray-500">{day.temp_min}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}
