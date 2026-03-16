resource "aws_cognito_user_pool" "main" {
  name = "${var.app_name}-users"

  # Password policy (only you will use this)
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  # Use email as username
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # MFA off — single personal user
  mfa_configuration = "OFF"

  # Account recovery via email
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  tags = { App = var.app_name }
}

resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.app_name}-frontend"
  user_pool_id = aws_cognito_user_pool.main.id

  # Auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  # Token validity
  access_token_validity  = 1   # hours
  id_token_validity      = 1   # hours
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # No client secret — public SPA client
  generate_secret = false

  # Callback / logout URLs — updated after Amplify domain is known
  callback_urls = ["http://localhost:3000"]
  logout_urls   = ["http://localhost:3000"]

  supported_identity_providers = ["COGNITO"]
}

# Hosted UI domain (prefix must be globally unique)
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.app_name}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}
