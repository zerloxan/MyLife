// Soccer
export interface Match {
  id: number;
  home: string;
  away: string;
  home_score: number | null;
  away_score: number | null;
  status: "SCHEDULED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "CANCELLED" | "POSTPONED";
  minute: number | null;
  utc_date: string;
}

export interface LeagueScores {
  league: string;
  code: string;
  matches: Match[];
  error?: string;
}

export interface SoccerData {
  leagues: LeagueScores[];
}

// Weather
export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  city: string;
}

export interface ForecastDay {
  dt: number;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast: ForecastDay[];
  location: string;
}

// Strava
export interface Activity {
  id: number;
  name: string;
  type: string;
  date: string;
  distance_miles: number;
  moving_time_minutes: number;
  total_elevation_gain_ft: number;
  average_heartrate: number | null;
  max_heartrate: number | null;
}

export interface StravaData {
  athlete: { name: string; profile: string | null };
  recent_run_totals: { count: number; distance_miles: number; elapsed_time_hours: number };
  ytd_run_totals: { count: number; distance_miles: number };
  recent_activities: Activity[];
  connected?: boolean;
}
