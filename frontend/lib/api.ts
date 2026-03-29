import { getWeather } from "./weather-api";
import { getSoccerScores } from "./soccer-api";
import { getStravaData } from "./strava-api";

export const api = {
  weather: getWeather,
  soccer: getSoccerScores,
  strava: getStravaData,
};
