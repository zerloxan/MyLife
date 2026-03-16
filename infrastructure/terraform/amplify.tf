resource "aws_amplify_app" "frontend" {
  name       = var.app_name
  repository = "https://github.com/${var.github_repo}"

  # Amplify uses a GitHub personal access token stored in GitHub Actions secrets.
  # Set AMPLIFY_GITHUB_TOKEN in your environment before running terraform apply,
  # or pass it via -var="github_token=..."
  access_token = var.github_token

  iam_service_role_arn = aws_iam_role.amplify.arn

  build_spec = <<-EOT
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - cd frontend
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: frontend/.next
        files:
          - '**/*'
      cache:
        paths:
          - frontend/node_modules/**/*
  EOT

  environment_variables = {
    NEXT_PUBLIC_API_URL      = "https://${aws_apigatewayv2_api.main.id}.execute-api.${var.aws_region}.amazonaws.com"
    NEXT_PUBLIC_COGNITO_POOL = aws_cognito_user_pool.main.id
    NEXT_PUBLIC_COGNITO_CLIENT = aws_cognito_user_pool_client.frontend.id
    NEXT_PUBLIC_COGNITO_DOMAIN = "${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
  }

  # Redirect all non-asset requests to Next.js (SPA fallback)
  custom_rule {
    source = "/<*>"
    status = "404-200"
    target = "/index.html"
  }

  tags = { App = var.app_name }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"
  framework   = "Next.js - SSR"
  stage       = "PRODUCTION"

  environment_variables = {
    AMPLIFY_MONOREPO_APP_ROOT = "frontend"
  }
}

# Add github_token variable
variable "github_token" {
  description = "GitHub personal access token for Amplify to pull the repo"
  type        = string
  sensitive   = true
}
