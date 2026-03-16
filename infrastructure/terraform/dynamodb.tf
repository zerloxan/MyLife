resource "aws_dynamodb_table" "main" {
  name         = var.app_name
  billing_mode = "PAY_PER_REQUEST"  # ~$0 at single-user scale
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  # TTL for cached API responses
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = { App = var.app_name }
}

# Key patterns:
#   PK=USER#strava  SK=TOKENS     → Strava OAuth tokens
#   PK=CACHE#soccer SK=<date>     → Soccer scores cache (TTL 5 min)
#   PK=CACHE#weather SK=current   → Weather cache (TTL 10 min)
