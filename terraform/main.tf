# =============================================================================
# AVNZ Payment Platform - AWS Infrastructure
# =============================================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use S3 backend for state storage
  # backend "s3" {
  #   bucket         = "avnz-terraform-state"
  #   key            = "payment-platform/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "avnz-terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "avnz-payment-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# =============================================================================
# Data Sources
# =============================================================================

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get default VPC
data "aws_vpc" "default" {
  default = true
}

# Get subnets in default VPC
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Get subnet details to filter by AZ
data "aws_subnet" "default" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Get Route53 hosted zone
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# =============================================================================
# Local Values
# =============================================================================

locals {
  name_prefix = "avnz"

  # Common tags
  common_tags = {
    Project     = "avnz-payment-platform"
    Environment = var.environment
  }

  # Get one subnet per availability zone (ALB requires unique AZs)
  az_subnet_map = {
    for subnet in data.aws_subnet.default :
    subnet.availability_zone => subnet.id...
  }

  # Select first subnet from each AZ
  unique_az_subnets = [
    for az, subnets in local.az_subnet_map : subnets[0]
  ]
}
