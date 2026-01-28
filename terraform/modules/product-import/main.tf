# ═══════════════════════════════════════════════════════════════
# Product Import Scalability Infrastructure
# ═══════════════════════════════════════════════════════════════
# This module provisions:
# - ElastiCache Redis cluster for Bull queue
# - ECS service for dedicated import workers
# - Application Auto Scaling for workers
# - CloudWatch alarms and dashboards
# ═══════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# ═══════════════════════════════════════════════════════════════
# ElastiCache Redis Cluster
# ═══════════════════════════════════════════════════════════════

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.environment}-product-import-redis"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-subnet-group"
  })
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "${var.environment}-product-import"
  replication_group_description = "Redis cluster for Bull queue (product import)"

  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  port                 = 6379

  # Node configuration
  node_type              = var.redis_node_type # cache.r7g.large
  num_cache_clusters     = var.redis_num_replicas # 3 (1 primary + 2 replicas)

  # High availability
  automatic_failover_enabled = true
  multi_az_enabled          = true

  # Backup configuration
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"  # UTC
  maintenance_window      = "mon:05:00-mon:07:00"

  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  auth_token_update_strategy = "ROTATE"

  # Network
  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_log.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(var.tags, {
    Name        = "${var.environment}-product-import-redis"
    Service     = "product-import"
    Criticality = "high"
  })
}

resource "aws_elasticache_parameter_group" "redis" {
  name   = "${var.environment}-product-import-redis-params"
  family = "redis7"

  # Performance tuning
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"  # Evict least recently used keys
  }

  parameter {
    name  = "timeout"
    value = "300"  # Close idle connections after 5 minutes
  }

  parameter {
    name  = "tcp-keepalive"
    value = "60"  # Send TCP keepalive every 60 seconds
  }

  # Persistence
  parameter {
    name  = "appendonly"
    value = "yes"
  }

  parameter {
    name  = "appendfsync"
    value = "everysec"  # Fsync every second (balance durability/performance)
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-params"
  })
}

# ═══════════════════════════════════════════════════════════════
# Security Groups
# ═══════════════════════════════════════════════════════════════

resource "aws_security_group" "redis" {
  name_prefix = "${var.environment}-product-import-redis-"
  description = "Security group for Product Import Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Redis from import workers"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.import_worker.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "import_worker" {
  name_prefix = "${var.environment}-product-import-worker-"
  description = "Security group for Product Import worker tasks"
  vpc_id      = var.vpc_id

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-worker-sg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# ═══════════════════════════════════════════════════════════════
# CloudWatch Log Groups
# ═══════════════════════════════════════════════════════════════

resource "aws_cloudwatch_log_group" "redis_slow_log" {
  name              = "/aws/elasticache/${var.environment}-product-import/slow-log"
  retention_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-slow-log"
  })
}

resource "aws_cloudwatch_log_group" "redis_engine_log" {
  name              = "/aws/elasticache/${var.environment}-product-import/engine-log"
  retention_in_days = 7

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-engine-log"
  })
}

resource "aws_cloudwatch_log_group" "import_worker" {
  name              = "/ecs/${var.environment}/product-import-worker"
  retention_in_days = 30

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-worker-logs"
  })
}

# ═══════════════════════════════════════════════════════════════
# ECS Task Definition (Import Worker)
# ═══════════════════════════════════════════════════════════════

resource "aws_ecs_task_definition" "import_worker" {
  family                   = "${var.environment}-product-import-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.worker_cpu     # 2048 (2 vCPU)
  memory                   = var.worker_memory  # 4096 (4 GB)
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "worker"
      image = var.worker_image

      command = ["node", "dist/workers/product-import-worker.js"]

      environment = [
        {
          name  = "WORKER_TYPE"
          value = "product-import"
        },
        {
          name  = "BULL_CONCURRENCY"
          value = tostring(var.worker_concurrency)
        },
        {
          name  = "ENABLE_API"
          value = "false"
        },
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "AWS_REGION"
          value = var.aws_region
        }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = var.database_secret_arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret_version.redis_url.arn
        },
        {
          name      = "INTEGRATION_ENCRYPTION_KEY"
          valueFrom = var.encryption_key_secret_arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.import_worker.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node healthcheck.js || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      stopTimeout = 60  # Allow 60s for graceful shutdown
    }
  ])

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-worker-task"
  })
}

# ═══════════════════════════════════════════════════════════════
# ECS Service (Import Worker)
# ═══════════════════════════════════════════════════════════════

resource "aws_ecs_service" "import_worker" {
  name            = "${var.environment}-product-import-worker"
  cluster         = var.ecs_cluster_id
  task_definition = aws_ecs_task_definition.import_worker.arn
  desired_count   = var.worker_min_count
  launch_type     = "FARGATE"

  platform_version = "LATEST"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.import_worker.id]
    assign_public_ip = false
  }

  # Allow auto-scaling to manage desired count
  lifecycle {
    ignore_changes = [desired_count]
  }

  # Deployment configuration
  deployment_configuration {
    maximum_percent         = 200  # Allow double during deployment
    minimum_healthy_percent = 100  # Keep all running
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-worker-service"
  })
}

# ═══════════════════════════════════════════════════════════════
# Application Auto Scaling
# ═══════════════════════════════════════════════════════════════

resource "aws_appautoscaling_target" "import_worker" {
  max_capacity       = var.worker_max_count
  min_capacity       = var.worker_min_count
  resource_id        = "service/${var.ecs_cluster_name}/${aws_ecs_service.import_worker.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale based on custom metric (Bull queue depth)
resource "aws_appautoscaling_policy" "import_worker_queue_depth" {
  name               = "${var.environment}-import-worker-queue-depth"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.import_worker.resource_id
  scalable_dimension = aws_appautoscaling_target.import_worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.import_worker.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = var.target_jobs_per_worker  # Default: 10

    customized_metric_specification {
      metric_name = "BullQueueDepth"
      namespace   = "AVNZ/ProductImport"
      statistic   = "Average"

      dimensions {
        name  = "Environment"
        value = var.environment
      }

      dimensions {
        name  = "QueueName"
        value = "product-import"
      }
    }

    scale_in_cooldown  = 300  # 5 minutes
    scale_out_cooldown = 60   # 1 minute
  }
}

# Scale based on CPU (backup scaling metric)
resource "aws_appautoscaling_policy" "import_worker_cpu" {
  name               = "${var.environment}-import-worker-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.import_worker.resource_id
  scalable_dimension = aws_appautoscaling_target.import_worker.scalable_dimension
  service_namespace  = aws_appautoscaling_target.import_worker.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value = 70.0  # 70% CPU

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ═══════════════════════════════════════════════════════════════
# IAM Roles & Policies
# ═══════════════════════════════════════════════════════════════

resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.environment}-product-import-worker-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-worker-execution-role"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${var.environment}-product-import-worker-secrets"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          var.database_secret_arn,
          aws_secretsmanager_secret_version.redis_url.arn,
          var.encryption_key_secret_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.environment}-product-import-worker-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-worker-task-role"
  })
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "${var.environment}-product-import-worker-s3"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:HeadObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${var.s3_bucket_arn}/*",
          var.s3_bucket_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task_cloudwatch" {
  name = "${var.environment}-product-import-worker-cloudwatch"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# ═══════════════════════════════════════════════════════════════
# Secrets Manager (Redis URL)
# ═══════════════════════════════════════════════════════════════

resource "aws_secretsmanager_secret" "redis_url" {
  name_prefix = "${var.environment}-product-import-redis-url-"
  description = "Redis connection URL for product import workers"

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-url"
  })
}

resource "aws_secretsmanager_secret_version" "redis_url" {
  secret_id = aws_secretsmanager_secret.redis_url.id
  secret_string = jsonencode({
    url = "rediss://:${var.redis_auth_token}@${aws_elasticache_replication_group.redis.configuration_endpoint_address}:6379"
  })
}

# ═══════════════════════════════════════════════════════════════
# CloudWatch Alarms
# ═══════════════════════════════════════════════════════════════

# Redis CPU
resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${var.environment}-product-import-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redis CPU utilization is high"
  alarm_actions       = [var.sns_alarm_topic_arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-cpu-high"
  })
}

# Redis Memory
resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${var.environment}-product-import-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Redis memory utilization is high"
  alarm_actions       = [var.sns_alarm_topic_arn]

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-redis-memory-high"
  })
}

# Queue Depth
resource "aws_cloudwatch_metric_alarm" "queue_overload" {
  alarm_name          = "${var.environment}-product-import-queue-overload"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BullQueueDepth"
  namespace           = "AVNZ/ProductImport"
  period              = 300
  statistic           = "Average"
  threshold           = 10000
  alarm_description   = "Product import queue is overloaded"
  alarm_actions       = [var.sns_critical_topic_arn]

  dimensions = {
    Environment = var.environment
    QueueName   = "product-import"
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-queue-overload"
  })
}

# Worker Count Low
resource "aws_cloudwatch_metric_alarm" "worker_count_low" {
  alarm_name          = "${var.environment}-product-import-worker-count-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "RunningTaskCount"
  namespace           = "AWS/ECS"
  period              = 180
  statistic           = "Average"
  threshold           = var.worker_min_count
  alarm_description   = "Product import worker count is below minimum"
  alarm_actions       = [var.sns_alarm_topic_arn]

  dimensions = {
    ServiceName = aws_ecs_service.import_worker.name
    ClusterName = var.ecs_cluster_name
  }

  tags = merge(var.tags, {
    Name = "${var.environment}-product-import-worker-count-low"
  })
}
