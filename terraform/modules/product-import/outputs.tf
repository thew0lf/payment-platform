# ═══════════════════════════════════════════════════════════════
# Product Import Module - Outputs
# ═══════════════════════════════════════════════════════════════

output "redis_endpoint" {
  description = "Redis primary endpoint address"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "redis_configuration_endpoint" {
  description = "Redis configuration endpoint (for cluster mode)"
  value       = aws_elasticache_replication_group.redis.configuration_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis.port
}

output "redis_security_group_id" {
  description = "Security group ID for Redis cluster"
  value       = aws_security_group.redis.id
}

output "worker_security_group_id" {
  description = "Security group ID for import workers"
  value       = aws_security_group.import_worker.id
}

output "worker_task_definition_arn" {
  description = "ARN of the worker task definition"
  value       = aws_ecs_task_definition.import_worker.arn
}

output "worker_task_definition_family" {
  description = "Family of the worker task definition"
  value       = aws_ecs_task_definition.import_worker.family
}

output "worker_service_name" {
  description = "Name of the ECS service for workers"
  value       = aws_ecs_service.import_worker.name
}

output "worker_service_id" {
  description = "ID of the ECS service for workers"
  value       = aws_ecs_service.import_worker.id
}

output "worker_log_group_name" {
  description = "CloudWatch log group name for workers"
  value       = aws_cloudwatch_log_group.import_worker.name
}

output "redis_url_secret_arn" {
  description = "ARN of Secrets Manager secret containing Redis URL"
  value       = aws_secretsmanager_secret.redis_url.arn
  sensitive   = true
}

output "autoscaling_target_id" {
  description = "Application Auto Scaling target resource ID"
  value       = aws_appautoscaling_target.import_worker.resource_id
}

output "alarms" {
  description = "Map of CloudWatch alarm names to ARNs"
  value = {
    redis_cpu_high      = aws_cloudwatch_metric_alarm.redis_cpu_high.arn
    redis_memory_high   = aws_cloudwatch_metric_alarm.redis_memory_high.arn
    queue_overload      = aws_cloudwatch_metric_alarm.queue_overload.arn
    worker_count_low    = aws_cloudwatch_metric_alarm.worker_count_low.arn
  }
}
