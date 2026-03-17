#!/usr/bin/env bash
# MyLife — first-time AWS deployment bootstrap
# Run from the repo root: bash scripts/bootstrap.sh
#
# Secrets are prompted at runtime and passed via environment variables.
# Nothing sensitive is written to disk.
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }
step()  { echo -e "\n${YELLOW}──────────────────────────────────${NC}"; echo -e "  $*"; echo -e "${YELLOW}──────────────────────────────────${NC}"; }
# Read a value without echoing it to the terminal
read_secret() { read -rsp "  $1: " "$2"; echo; }
read_value()  { read -rp  "  $1: " "$2"; }

# ── Prerequisites ─────────────────────────────────────────────────────────────
step "Checking prerequisites"

if ! command -v aws >/dev/null 2>&1; then
  [ -f "/c/Program Files/Amazon/AWSCLIV2/aws.exe" ] \
    && export PATH="$PATH:/c/Program Files/Amazon/AWSCLIV2" \
    || error "aws CLI not found. Install from: https://aws.amazon.com/cli/"
fi
if ! command -v terraform >/dev/null 2>&1; then
  [ -f "$HOME/bin/terraform.exe" ] \
    && export PATH="$PATH:$HOME/bin" \
    || error "terraform not found. Place terraform.exe in $HOME/bin/"
fi
command -v docker >/dev/null 2>&1 || error "Docker not running. Start Docker Desktop first."
info "aws, terraform, docker found"

AWS_REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || error "AWS credentials not configured. Run: aws configure"
info "AWS account: $ACCOUNT_ID (region: $AWS_REGION)"

# ── Collect secrets from secrets.env or interactively ────────────────────────
step "Loading secrets"
SECRETS_FILE="secrets.env"

if [ -f "$SECRETS_FILE" ]; then
  set -a; source "$SECRETS_FILE"; set +a
  info "Loaded secrets from $SECRETS_FILE"
  GITHUB_REPO="${GITHUB_REPO:-}"
  GITHUB_TOKEN="${GITHUB_TOKEN:-}"
  FOOTBALL_KEY="${FOOTBALL_DATA_API_KEY:-}"
  WEATHER_KEY="${OPENWEATHERMAP_API_KEY:-}"
else
  warn "No secrets.env found — prompting instead."
  warn "Tip: copy secrets.env.example to secrets.env to avoid typing these each time."
  echo ""
  GITHUB_REPO=""; GITHUB_TOKEN=""; FOOTBALL_KEY=""; WEATHER_KEY=""
fi

# Prompt for any values not set in the file
[ -z "$GITHUB_REPO" ]    && read_value  "GitHub repo (e.g. zerloxan/MyLife)" GITHUB_REPO
[ -z "$GITHUB_TOKEN" ]   && read_secret "GitHub Personal Access Token (repo scope)" GITHUB_TOKEN
[ -z "$FOOTBALL_KEY" ]   && read_secret "football-data.org API key" FOOTBALL_KEY
[ -z "$WEATHER_KEY" ]    && read_secret "OpenWeatherMap API key" WEATHER_KEY

# Export as TF_VAR_* — Terraform reads these automatically, no tfvars needed
export TF_VAR_github_repo="$GITHUB_REPO"
export TF_VAR_github_token="$GITHUB_TOKEN"
export TF_VAR_football_data_api_key="$FOOTBALL_KEY"
export TF_VAR_openweathermap_api_key="$WEATHER_KEY"
export TF_VAR_aws_region="$AWS_REGION"
export TF_VAR_app_name="mylife"

# Also write the backend .env for local dev (API keys only, no tokens)
ENV_FILE="backend/.env"
if [ ! -f "$ENV_FILE" ] || ! grep -q "FOOTBALL_DATA_API_KEY=$FOOTBALL_KEY" "$ENV_FILE" 2>/dev/null; then
  cat > "$ENV_FILE" <<EOF
FOOTBALL_DATA_API_KEY=$FOOTBALL_KEY
OPENWEATHERMAP_API_KEY=$WEATHER_KEY
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:8000/api/strava/callback
DYNAMODB_TABLE_NAME=mylife
AWS_REGION=us-east-1
ENVIRONMENT=development
EOF
  info "Updated backend/.env with API keys"
fi

info "Secrets loaded into environment"

# ── Phase 1: Create ECR ───────────────────────────────────────────────────────
TFDIR="infrastructure/terraform"
step "Phase 1 — Creating ECR repository"
cd "$TFDIR"
terraform init -upgrade -input=false
terraform apply -target=aws_ecr_repository.backend -auto-approve -input=false
ECR_URL=$(terraform output -raw ecr_repository_url)
info "ECR repository: $ECR_URL"
cd - >/dev/null

# ── Phase 2: Build and push backend image ────────────────────────────────────
step "Phase 2 — Building and pushing backend image"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_URL"

docker buildx build \
  --platform linux/amd64 \
  --provenance=false \
  --output type=image,name="$ECR_URL:latest",push=true \
  ./backend
info "Image pushed: $ECR_URL:latest"

# ── Phase 3: Full Terraform apply ────────────────────────────────────────────
step "Phase 3 — Applying full infrastructure"
cd "$TFDIR"

OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  warn "GitHub OIDC provider already exists — importing into Terraform state"
  terraform import aws_iam_openid_connect_provider.github "$OIDC_ARN" 2>/dev/null || true
fi

terraform apply -auto-approve -input=false
info "Infrastructure deployed"

ROLE_ARN=$(terraform output -raw github_actions_role_arn)
API_URL=$(terraform output -raw api_gateway_url)
POOL_ID=$(terraform output -raw cognito_user_pool_id)
HOSTED_UI=$(terraform output -raw cognito_hosted_ui_url)
S3_BUCKET=$(terraform output -raw s3_bucket_name)
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id)
FRONTEND_URL=$(terraform output -raw frontend_url)
cd - >/dev/null

# ── Phase 4: Create Cognito user ─────────────────────────────────────────────
step "Phase 4 — Creating your login account"
read_value "Your email address for login" USER_EMAIL
read_secret "Choose a temporary password (min 12 chars, upper+lower+number)" TEMP_PASS
aws cognito-idp admin-create-user \
  --user-pool-id "$POOL_ID" \
  --username "$USER_EMAIL" \
  --temporary-password "$TEMP_PASS" \
  --message-action SUPPRESS \
  --region "$AWS_REGION"
info "User created: $USER_EMAIL"
warn "You will be prompted to set a permanent password on first login."

# ── Summary ───────────────────────────────────────────────────────────────────
step "Done! Next steps"
echo ""
echo "  1. Add these secrets to GitHub (repo Settings → Secrets → Actions):"
echo ""
echo "     AWS_DEPLOY_ROLE_ARN          = $ROLE_ARN"
echo "     NEXT_PUBLIC_API_URL          = $API_URL"
echo "     S3_BUCKET_NAME               = $S3_BUCKET"
echo "     CLOUDFRONT_DISTRIBUTION_ID   = $CF_DIST_ID"
echo ""
echo "  2. Push to main to trigger your first automated deploy:"
echo "     git add -A && git commit -m 'Initial deploy' && git push origin main"
echo ""
echo "  3. Your app will be live at: $FRONTEND_URL"
echo "  4. Cognito login:            $HOSTED_UI"
echo ""
info "Bootstrap complete!"
