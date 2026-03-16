#!/usr/bin/env bash
# MyLife — first-time AWS deployment bootstrap
# Run from the repo root: bash scripts/bootstrap.sh
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }
step()  { echo -e "\n${YELLOW}──────────────────────────────────${NC}"; echo -e "  $*"; echo -e "${YELLOW}──────────────────────────────────${NC}"; }

# ── Prerequisites ────────────────────────────────────────────────────────────
step "Checking prerequisites"
command -v aws       >/dev/null 2>&1 || error "aws CLI not found. Install: https://aws.amazon.com/cli/"
command -v terraform >/dev/null 2>&1 || error "terraform not found. Install: https://developer.hashicorp.com/terraform/install"
command -v docker    >/dev/null 2>&1 || error "docker not found. Install: https://docs.docker.com/get-docker/"
info "aws, terraform, docker found"

AWS_REGION=${AWS_REGION:-us-east-1}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || error "AWS credentials not configured. Run: aws configure"
info "AWS account: $ACCOUNT_ID (region: $AWS_REGION)"

# ── tfvars ───────────────────────────────────────────────────────────────────
step "Terraform variables"
TFDIR="infrastructure/terraform"
if [ ! -f "$TFDIR/terraform.tfvars" ]; then
  cp "$TFDIR/terraform.tfvars.example" "$TFDIR/terraform.tfvars"
  warn "Created terraform.tfvars — fill in your values now, then re-run this script."
  echo ""
  echo "  Required fields to edit in $TFDIR/terraform.tfvars:"
  echo "    github_repo   — your GitHub username/MyLife"
  echo "    github_token  — GitHub PAT with 'repo' scope"
  echo "    API keys      — football_data_api_key, openweathermap_api_key"
  echo ""
  echo "  Then run: bash scripts/bootstrap.sh"
  exit 0
fi

GITHUB_REPO=$(grep 'github_repo' "$TFDIR/terraform.tfvars" | sed 's/.*= *"\(.*\)"/\1/')
[ -z "$GITHUB_REPO" ] || [ "$GITHUB_REPO" = "YOUR_GITHUB_USERNAME/MyLife" ] \
  && error "Set github_repo in terraform.tfvars before continuing"
info "GitHub repo: $GITHUB_REPO"

# ── Phase 1: Create ECR (must exist before we can push an image) ─────────────
step "Phase 1 — Creating ECR repository"
cd "$TFDIR"
terraform init -upgrade -input=false
terraform apply -target=aws_ecr_repository.backend -auto-approve -input=false
ECR_URL=$(terraform output -raw ecr_repository_url)
info "ECR repository: $ECR_URL"
cd - >/dev/null

# ── Phase 2: Build and push initial Docker image ─────────────────────────────
step "Phase 2 — Building and pushing backend image"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_URL"

docker build -t mylife-backend ./backend
docker tag mylife-backend "$ECR_URL:latest"
docker push "$ECR_URL:latest"
info "Image pushed: $ECR_URL:latest"

# ── Phase 3: Full Terraform apply ─────────────────────────────────────────────
step "Phase 3 — Applying full infrastructure"
cd "$TFDIR"

# Check if GitHub OIDC provider already exists and import it if needed
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  warn "GitHub OIDC provider already exists — importing into state"
  terraform import aws_iam_openid_connect_provider.github "$OIDC_ARN" 2>/dev/null || true
fi

terraform apply -auto-approve -input=false
info "Infrastructure deployed"

# ── Outputs ──────────────────────────────────────────────────────────────────
step "Deployment complete — save these values"
echo ""
terraform output
echo ""

ROLE_ARN=$(terraform output -raw github_actions_role_arn)
AMPLIFY_URL=$(terraform output -raw amplify_app_url)
POOL_ID=$(terraform output -raw cognito_user_pool_id)
HOSTED_UI=$(terraform output -raw cognito_hosted_ui_url)
cd - >/dev/null

# ── Phase 4: Create Cognito user ──────────────────────────────────────────────
step "Phase 4 — Creating your Cognito user"
read -rp "  Enter your email address for login: " USER_EMAIL
aws cognito-idp admin-create-user \
  --user-pool-id "$POOL_ID" \
  --username "$USER_EMAIL" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region "$AWS_REGION"
info "User created: $USER_EMAIL (temporary password: TempPass123!)"
warn "You will be prompted to change your password on first login."

# ── Summary ───────────────────────────────────────────────────────────────────
step "Next steps"
echo ""
echo "  1. Add this secret to your GitHub repo (Settings → Secrets → Actions):"
echo "     AWS_DEPLOY_ROLE_ARN = $ROLE_ARN"
echo ""
echo "  2. Push to main to trigger your first CI/CD deployment:"
echo "     git push origin main"
echo ""
echo "  3. Your app will be live at:"
echo "     $AMPLIFY_URL"
echo ""
echo "  4. Login at:"
echo "     $HOSTED_UI"
echo ""
info "Bootstrap complete!"
