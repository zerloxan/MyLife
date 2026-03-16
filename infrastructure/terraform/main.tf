terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after running: aws s3 mb s3://<your-bucket> --region us-east-1
  # backend "s3" {
  #   bucket = "mylife-terraform-state"
  #   key    = "mylife/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}
