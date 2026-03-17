output "api_gateway_url" {
  description = "Base URL for the API Gateway (set as NEXT_PUBLIC_API_URL in frontend)"
  value       = "https://${aws_apigatewayv2_api.main.id}.execute-api.${var.aws_region}.amazonaws.com"
}

output "ecr_repository_url" {
  description = "ECR repository URL (used by CI/CD to push backend images)"
  value       = aws_ecr_repository.backend.repository_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito App Client ID (used by frontend)"
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_hosted_ui_url" {
  description = "URL to the Cognito hosted login page"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com/login?client_id=${aws_cognito_user_pool_client.frontend.id}&response_type=token&scope=openid+email&redirect_uri=http://localhost:3000"
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.main.name
}

output "lambda_function_name" {
  description = "Lambda function name (used by CI/CD to update the image)"
  value       = aws_lambda_function.backend.function_name
}
