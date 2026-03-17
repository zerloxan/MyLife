# GitHub Actions OIDC — allows GitHub Actions to assume an AWS role
# without storing long-lived AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY secrets.
#
# The bootstrap script handles importing this if it already exists in your account.

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]

  lifecycle {
    # Safe to import if it already exists in the account
    ignore_changes = [thumbprint_list]
  }
}

resource "aws_iam_role" "github_actions" {
  name = "${var.app_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          # Only this repo's main branch can assume the role
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:ref:refs/heads/main"
        }
      }
    }]
  })

  tags = { App = var.app_name }
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name = "deploy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:CompleteLayerUpload",
          "ecr:InitiateLayerUpload", "ecr:PutImage", "ecr:UploadLayerPart",
          "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer",
        ]
        Resource = aws_ecr_repository.backend.arn
      },
      {
        Effect   = "Allow"
        Action   = ["lambda:UpdateFunctionCode", "lambda:GetFunction", "lambda:GetFunctionConfiguration"]
        Resource = aws_lambda_function.backend.arn
      },
      # S3 — sync built frontend files
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*",
        ]
      },
      # CloudFront — invalidate cache after deploy
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.frontend.arn
      },
      # API Gateway — read endpoint URL for smoke test
      {
        Effect   = "Allow"
        Action   = ["apigateway:GET"]
        Resource = "*"
      },
    ]
  })
}

output "github_actions_role_arn" {
  description = "Set this as AWS_DEPLOY_ROLE_ARN in GitHub Actions secrets"
  value       = aws_iam_role.github_actions.arn
}
