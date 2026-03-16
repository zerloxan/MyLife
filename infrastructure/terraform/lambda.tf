locals {
  # Placeholder image used on first terraform apply before CI/CD pushes a real image.
  # After first deploy, CI/CD manages the image URI via `aws lambda update-function-code`.
  initial_image_uri = "${aws_ecr_repository.backend.repository_url}:latest"
}

resource "aws_lambda_function" "backend" {
  function_name = "${var.app_name}-backend"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = local.initial_image_uri
  timeout       = 30
  memory_size   = 512

  environment {
    variables = {
      ENVIRONMENT            = "production"
      DYNAMODB_TABLE_NAME    = aws_dynamodb_table.main.name
      AWS_REGION_NAME        = var.aws_region
      FOOTBALL_DATA_API_KEY  = var.football_data_api_key
      OPENWEATHERMAP_API_KEY = var.openweathermap_api_key
      STRAVA_CLIENT_ID       = var.strava_client_id
      STRAVA_CLIENT_SECRET   = var.strava_client_secret
      STRAVA_REDIRECT_URI    = "https://${aws_apigatewayv2_api.main.id}.execute-api.${var.aws_region}.amazonaws.com/api/strava/callback"
    }
  }

  # CI/CD manages the image URI after first apply — don't let Terraform revert it
  lifecycle {
    ignore_changes = [image_uri]
  }

  tags = { App = var.app_name }
}

resource "aws_lambda_function_url" "backend" {
  function_name      = aws_lambda_function.backend.function_name
  authorization_type = "NONE"  # API Gateway handles auth
}

# Allow API Gateway to invoke the Lambda
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
