# =============================================================================
# Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "avnz"
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "avnz.io"
}

# =============================================================================
# API Service Variables
# =============================================================================

variable "api_subdomain" {
  description = "Subdomain for API"
  type        = string
  default     = "api"
}

variable "api_container_port" {
  description = "Port the API container listens on"
  type        = number
  default     = 3000
}

variable "api_cpu" {
  description = "CPU units for API task (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory for API task in MB"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 1
}

variable "api_min_capacity" {
  description = "Minimum number of API tasks for autoscaling"
  type        = number
  default     = 1
}

variable "api_max_capacity" {
  description = "Maximum number of API tasks for autoscaling"
  type        = number
  default     = 4
}

# =============================================================================
# RDS Database Variables
# =============================================================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max allocated storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "payment_platform"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = false
}

# Legacy variable - kept for compatibility but not used when RDS is managed
variable "database_url" {
  description = "PostgreSQL connection string (not used when RDS is managed by Terraform)"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# Auth0 Variables
# =============================================================================

variable "auth0_domain" {
  description = "Auth0 domain"
  type        = string
  sensitive   = true
}

variable "auth0_client_id" {
  description = "Auth0 client ID"
  type        = string
  sensitive   = true
}

variable "auth0_client_secret" {
  description = "Auth0 client secret"
  type        = string
  sensitive   = true
}

variable "auth0_audience" {
  description = "Auth0 API audience"
  type        = string
  sensitive   = true
}

# =============================================================================
# JWT / Security Variables
# =============================================================================

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "integration_encryption_key" {
  description = "AES-256 encryption key for integration credentials (64 hex chars)"
  type        = string
  sensitive   = true
}

variable "cart_recovery_secret" {
  description = "HMAC secret for cart recovery token signing (64 hex chars)"
  type        = string
  sensitive   = true
}

variable "ip_hash_salt" {
  description = "Salt for hashing visitor IP addresses for GDPR compliance (32 hex chars)"
  type        = string
  sensitive   = true
}

variable "portal_url" {
  description = "Company portal URL for cart recovery email links"
  type        = string
  default     = "https://portal.avnz.io"
}

# =============================================================================
# Optional Variables
# =============================================================================

variable "sentry_dsn" {
  description = "Sentry DSN for error monitoring (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "redis_url" {
  description = "Redis connection string (optional)"
  type        = string
  default     = ""
  sensitive   = true
}

# =============================================================================
# Founders Landing Variables
# =============================================================================

variable "founders_subdomain" {
  description = "Subdomain for founders landing page"
  type        = string
  default     = "founders"
}

variable "founders_container_port" {
  description = "Port the founders container listens on"
  type        = number
  default     = 3002
}

variable "founders_cpu" {
  description = "CPU units for founders task (1 vCPU = 1024)"
  type        = number
  default     = 256
}

variable "founders_memory" {
  description = "Memory for founders task in MB"
  type        = number
  default     = 512
}

variable "founders_desired_count" {
  description = "Desired number of founders tasks"
  type        = number
  default     = 1
}

# =============================================================================
# GitHub Actions CI/CD Variables
# =============================================================================

variable "github_org" {
  description = "GitHub organization or username"
  type        = string
  default     = "thew0lf"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "payment-platform"
}
