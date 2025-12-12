# =============================================================================
# Founders Landing Page - ECS Fargate Configuration
# =============================================================================

# =============================================================================
# ECR Repository
# =============================================================================

resource "aws_ecr_repository" "founders" {
  name                 = "${local.name_prefix}-founders"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${local.name_prefix}-founders"
  }
}

resource "aws_ecr_lifecycle_policy" "founders" {
  repository = aws_ecr_repository.founders.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
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

resource "aws_cloudwatch_log_group" "founders" {
  name              = "/ecs/${local.name_prefix}-founders"
  retention_in_days = 30

  tags = {
    Name = "${local.name_prefix}-founders-logs"
  }
}

# =============================================================================
# SSL Certificate for founders subdomain
# =============================================================================

resource "aws_acm_certificate" "founders" {
  domain_name       = "${var.founders_subdomain}.${var.domain_name}"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.founders_subdomain}.${var.domain_name}"
  }
}

# DNS validation record
resource "aws_route53_record" "founders_cert_validation" {
  allow_overwrite = true
  name            = tolist(aws_acm_certificate.founders.domain_validation_options)[0].resource_record_name
  records         = [tolist(aws_acm_certificate.founders.domain_validation_options)[0].resource_record_value]
  ttl             = 60
  type            = tolist(aws_acm_certificate.founders.domain_validation_options)[0].resource_record_type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for certificate validation
resource "aws_acm_certificate_validation" "founders" {
  certificate_arn         = aws_acm_certificate.founders.arn
  validation_record_fqdns = [aws_route53_record.founders_cert_validation.fqdn]
}

# =============================================================================
# Target Group
# =============================================================================

resource "aws_lb_target_group" "founders" {
  name        = "${local.name_prefix}-founders-tg"
  port        = var.founders_container_port
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
    Name = "${local.name_prefix}-founders-tg"
  }
}

# =============================================================================
# ALB Listener Rule (host-based routing)
# =============================================================================

resource "aws_lb_listener_rule" "founders" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.founders.arn
  }

  condition {
    host_header {
      values = ["${var.founders_subdomain}.${var.domain_name}"]
    }
  }
}

# Add founders certificate to HTTPS listener
resource "aws_lb_listener_certificate" "founders" {
  listener_arn    = aws_lb_listener.https.arn
  certificate_arn = aws_acm_certificate_validation.founders.certificate_arn
}

# =============================================================================
# Route53 DNS Record
# =============================================================================

resource "aws_route53_record" "founders" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${var.founders_subdomain}.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# =============================================================================
# ECS Task Definition
# =============================================================================

resource "aws_ecs_task_definition" "founders" {
  family                   = "${local.name_prefix}-founders"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.founders_cpu
  memory                   = var.founders_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "founders"
      image = "${aws_ecr_repository.founders.repository_url}:latest"

      portMappings = [
        {
          containerPort = var.founders_container_port
          hostPort      = var.founders_container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "PORT", value = tostring(var.founders_container_port) },
        { name = "POSTGRES_URL", value = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}?schema=public" },
        { name = "NEXT_PUBLIC_BASE_URL", value = "https://${var.founders_subdomain}.${var.domain_name}" },
        { name = "NEXT_PUBLIC_APP_NAME", value = "avnz.io Founders" },
        { name = "PLATFORM_API_URL", value = "https://${var.api_subdomain}.${var.domain_name}" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.founders.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "founders"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:${var.founders_container_port}/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      essential = true
    }
  ])

  tags = {
    Name = "${local.name_prefix}-founders-task"
  }
}

# =============================================================================
# ECS Service
# =============================================================================

resource "aws_ecs_service" "founders" {
  name                               = "${local.name_prefix}-founders"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.founders.arn
  desired_count                      = var.founders_desired_count
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
    target_group_arn = aws_lb_target_group.founders.arn
    container_name   = "founders"
    container_port   = var.founders_container_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener.https, aws_lb_listener_rule.founders]

  tags = {
    Name = "${local.name_prefix}-founders-service"
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "founders_ecr_repository_url" {
  description = "ECR repository URL for founders"
  value       = aws_ecr_repository.founders.repository_url
}

output "founders_url" {
  description = "Founders landing page URL"
  value       = "https://${var.founders_subdomain}.${var.domain_name}"
}
