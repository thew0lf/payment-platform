# =============================================================================
# Admin Dashboard - ECS Fargate Configuration
# SOC2/ISO27001/PCI-DSS Compliant Infrastructure
# =============================================================================

# =============================================================================
# Variables
# =============================================================================

variable "admin_subdomain" {
  description = "Subdomain for admin dashboard"
  type        = string
  default     = "app"
}

variable "admin_container_port" {
  description = "Port the admin container listens on"
  type        = number
  default     = 3000
}

variable "admin_cpu" {
  description = "CPU units for admin task (1 vCPU = 1024)"
  type        = number
  default     = 256
}

variable "admin_memory" {
  description = "Memory for admin task in MB"
  type        = number
  default     = 512
}

variable "admin_desired_count" {
  description = "Desired number of admin tasks"
  type        = number
  default     = 1
}

# =============================================================================
# ECR Repository
# =============================================================================

resource "aws_ecr_repository" "admin" {
  name                 = "${local.name_prefix}-admin-dashboard"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true  # PCI-DSS 6.1 - Vulnerability scanning
  }

  encryption_configuration {
    encryption_type = "AES256"  # SOC2 CC6.7 - Encryption at rest
  }

  tags = {
    Name        = "${local.name_prefix}-admin-dashboard"
    Environment = var.environment
    Compliance  = "SOC2-ISO27001-PCI-DSS"
  }
}

resource "aws_ecr_lifecycle_policy" "admin" {
  repository = aws_ecr_repository.admin.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images for rollback capability"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# =============================================================================
# CloudWatch Log Group
# =============================================================================

resource "aws_cloudwatch_log_group" "admin" {
  name              = "/ecs/${local.name_prefix}-admin-dashboard"
  retention_in_days = 90  # SOC2 CC7.2 / PCI-DSS 10.7 - Log retention

  tags = {
    Name        = "${local.name_prefix}-admin-dashboard-logs"
    Environment = var.environment
    Compliance  = "SOC2-ISO27001-PCI-DSS"
  }
}

# =============================================================================
# SSL Certificate for admin subdomain
# =============================================================================

resource "aws_acm_certificate" "admin" {
  domain_name       = "${var.admin_subdomain}.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.admin_subdomain}.${var.domain_name}"
    Environment = var.environment
  }
}

# DNS validation record
resource "aws_route53_record" "admin_cert_validation" {
  allow_overwrite = true
  name            = tolist(aws_acm_certificate.admin.domain_validation_options)[0].resource_record_name
  records         = [tolist(aws_acm_certificate.admin.domain_validation_options)[0].resource_record_value]
  ttl             = 60
  type            = tolist(aws_acm_certificate.admin.domain_validation_options)[0].resource_record_type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "admin" {
  certificate_arn         = aws_acm_certificate.admin.arn
  validation_record_fqdns = [aws_route53_record.admin_cert_validation.fqdn]
}

# =============================================================================
# Target Group
# =============================================================================

resource "aws_lb_target_group" "admin" {
  name        = "${local.name_prefix}-admin-tg"
  port        = var.admin_container_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
  }

  tags = {
    Name        = "${local.name_prefix}-admin-tg"
    Environment = var.environment
  }
}

# =============================================================================
# ALB Listener Rule (host-based routing)
# =============================================================================

resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 90

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  condition {
    host_header {
      values = ["${var.admin_subdomain}.${var.domain_name}"]
    }
  }
}

# Add admin certificate to HTTPS listener
resource "aws_lb_listener_certificate" "admin" {
  listener_arn    = aws_lb_listener.https.arn
  certificate_arn = aws_acm_certificate_validation.admin.certificate_arn
}

# =============================================================================
# Route53 DNS Record
# =============================================================================

resource "aws_route53_record" "admin" {
  zone_id         = data.aws_route53_zone.main.zone_id
  name            = "${var.admin_subdomain}.${var.domain_name}"
  type            = "A"
  allow_overwrite = true

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# =============================================================================
# ECS Task Definition
# =============================================================================

resource "aws_ecs_task_definition" "admin" {
  family                   = "${local.name_prefix}-admin-dashboard"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.admin_cpu
  memory                   = var.admin_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "admin-dashboard"
      image = "${aws_ecr_repository.admin.repository_url}:latest"

      portMappings = [
        {
          containerPort = var.admin_container_port
          hostPort      = var.admin_container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = tostring(var.admin_container_port) },
        { name = "NEXT_PUBLIC_API_URL", value = "https://${var.api_subdomain}.${var.domain_name}" },
        { name = "NEXT_PUBLIC_APP_URL", value = "https://${var.admin_subdomain}.${var.domain_name}" },
        { name = "NEXT_PUBLIC_AUTH0_DOMAIN", value = var.auth0_domain },
        { name = "NEXT_PUBLIC_AUTH0_CLIENT_ID", value = var.auth0_client_id },
        { name = "NEXT_PUBLIC_AUTH0_AUDIENCE", value = var.auth0_audience },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.admin.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "admin-dashboard"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${var.admin_container_port}/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${local.name_prefix}-admin-dashboard-task"
    Environment = var.environment
    Compliance  = "SOC2-ISO27001-PCI-DSS"
  }
}

# =============================================================================
# ECS Service
# =============================================================================

resource "aws_ecs_service" "admin" {
  name                               = "${local.name_prefix}-admin-dashboard"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.admin.arn
  desired_count                      = var.admin_desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 60
  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.admin.arn
    container_name   = "admin-dashboard"
    container_port   = var.admin_container_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true  # PCI-DSS 6.4.2 - Rollback capability
  }

  depends_on = [aws_lb_listener.https, aws_lb_listener_rule.admin]

  tags = {
    Name        = "${local.name_prefix}-admin-dashboard-service"
    Environment = var.environment
    Compliance  = "SOC2-ISO27001-PCI-DSS"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# =============================================================================
# Auto Scaling
# =============================================================================

resource "aws_appautoscaling_target" "admin" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.admin.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "admin_cpu" {
  name               = "${local.name_prefix}-admin-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.admin.resource_id
  scalable_dimension = aws_appautoscaling_target.admin.scalable_dimension
  service_namespace  = aws_appautoscaling_target.admin.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "admin_ecr_repository_url" {
  description = "ECR repository URL for admin dashboard"
  value       = aws_ecr_repository.admin.repository_url
}

output "admin_url" {
  description = "Admin dashboard URL"
  value       = "https://${var.admin_subdomain}.${var.domain_name}"
}
