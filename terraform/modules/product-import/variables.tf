# ═══════════════════════════════════════════════════════════════
# Product Import Module - Variables
# ═══════════════════════════════════════════════════════════════

variable "environment" {
  description = "Environment name (e.g., production, staging, development)"
  type        = string
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "vpc_id" {
  description = "VPC ID where resources will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for ECS tasks and ElastiCache"
  type        = list(string)
}

variable "tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

# ═══════════════════════════════════════════════════════════════
# Redis Configuration
# ═══════════════════════════════════════════════════════════════

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r7g.large"  # 13.07 GiB memory
}

variable "redis_num_replicas" {
  description = "Number of Redis replicas (total nodes = replicas count)"
  type        = number
  default     = 3  # 1 primary + 2 replicas
}

variable "redis_auth_token" {
  description = "Redis authentication token (must be 16-128 alphanumeric characters)"
  type        = string
  sensitive   = true
}

# ═══════════════════════════════════════════════════════════════
# ECS Worker Configuration
# ═══════════════════════════════════════════════════════════════

variable "ecs_cluster_id" {
  description = "ECS cluster ID where workers will run"
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name"
  type        = string
}

variable "worker_image" {
  description = "Docker image for import worker"
  type        = string
}

variable "worker_cpu" {
  description = "CPU units for worker task (1024 = 1 vCPU)"
  type        = number
  default     = 2048  # 2 vCPU
}

variable "worker_memory" {
  description = "Memory (MB) for worker task"
  type        = number
  default     = 4096  # 4 GB
}

variable "worker_concurrency" {
  description = "Number of concurrent jobs per worker"
  type        = number
  default     = 5
}

variable "worker_min_count" {
  description = "Minimum number of worker tasks"
  type        = number
  default     = 2
}

variable "worker_max_count" {
  description = "Maximum number of worker tasks"
  type        = number
  default     = 50
}

variable "target_jobs_per_worker" {
  description = "Target number of queued jobs per worker for auto-scaling"
  type        = number
  default     = 10
}

# ═══════════════════════════════════════════════════════════════
# External Dependencies
# ═══════════════════════════════════════════════════════════════

variable "database_secret_arn" {
  description = "ARN of Secrets Manager secret containing DATABASE_URL"
  type        = string
}

variable "encryption_key_secret_arn" {
  description = "ARN of Secrets Manager secret containing INTEGRATION_ENCRYPTION_KEY"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of S3 bucket for product images"
  type        = string
}

variable "sns_alarm_topic_arn" {
  description = "SNS topic ARN for non-critical alarms"
  type        = string
}

variable "sns_critical_topic_arn" {
  description = "SNS topic ARN for critical alarms"
  type        = string
}
