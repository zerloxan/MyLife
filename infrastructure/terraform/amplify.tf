# Frontend is hosted on Vercel (free, purpose-built for Next.js).
# Amplify was removed due to AWS account restrictions on new accounts.
#
# To connect Vercel:
#   1. Go to vercel.com and import the GitHub repo
#   2. Set root directory to: frontend
#   3. Add environment variable: NEXT_PUBLIC_API_URL = <api_gateway_url output>

# Keep the github_token variable so secrets.env doesn't break
variable "github_token" {
  description = "GitHub personal access token (kept for reference, no longer used by Terraform)"
  type        = string
  sensitive   = true
  default     = ""
}
