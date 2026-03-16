variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name prefix for all resources"
  type        = string
  default     = "mylife"
}

variable "github_repo" {
  description = "GitHub repo in org/repo format (e.g. myuser/MyLife)"
  type        = string
}

variable "football_data_api_key" {
  description = "football-data.org API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "openweathermap_api_key" {
  description = "OpenWeatherMap API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "strava_client_id" {
  description = "Strava OAuth client ID"
  type        = string
  sensitive   = true
  default     = ""
}

variable "strava_client_secret" {
  description = "Strava OAuth client secret"
  type        = string
  sensitive   = true
  default     = ""
}
