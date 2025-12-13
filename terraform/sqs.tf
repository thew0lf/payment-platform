# =============================================================================
# SQS Queues for Email Processing
# Production-grade email queue with Dead Letter Queue for failed messages
# =============================================================================

# Dead Letter Queue for failed email messages
resource "aws_sqs_queue" "email_dlq" {
  name                       = "${local.name_prefix}-email-dlq"
  message_retention_seconds  = 1209600  # 14 days
  visibility_timeout_seconds = 30

  tags = {
    Name        = "${local.name_prefix}-email-dlq"
    Purpose     = "Dead letter queue for failed email sends"
    Environment = var.environment
  }
}

# Main Email Queue
resource "aws_sqs_queue" "email" {
  name                       = "${local.name_prefix}-email-queue"
  delay_seconds              = 0
  max_message_size           = 262144  # 256 KB
  message_retention_seconds  = 345600  # 4 days
  receive_wait_time_seconds  = 20       # Long polling
  visibility_timeout_seconds = 60       # 1 minute for processing

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq.arn
    maxReceiveCount     = 3  # Move to DLQ after 3 failed attempts
  })

  tags = {
    Name        = "${local.name_prefix}-email-queue"
    Purpose     = "Email sending queue for SOC2/ISO27001 compliant email processing"
    Environment = var.environment
  }
}

# Queue policy - allow ECS tasks to send/receive messages
resource "aws_sqs_queue_policy" "email" {
  queue_url = aws_sqs_queue.email.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowECSTaskAccess"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ecs_task.arn
        }
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = aws_sqs_queue.email.arn
      }
    ]
  })
}

# CloudWatch Alarm for DLQ messages (alert when emails are failing)
resource "aws_cloudwatch_metric_alarm" "email_dlq_messages" {
  alarm_name          = "${local.name_prefix}-email-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300  # 5 minutes
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alert when emails are failing and moved to DLQ"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.email_dlq.name
  }

  tags = {
    Name = "${local.name_prefix}-email-dlq-alarm"
  }
}

# CloudWatch Alarm for queue depth (backlog warning)
resource "aws_cloudwatch_metric_alarm" "email_queue_depth" {
  alarm_name          = "${local.name_prefix}-email-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300  # 5 minutes
  statistic           = "Average"
  threshold           = 1000  # Alert if more than 1000 messages in queue
  alarm_description   = "Alert when email queue has significant backlog"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = aws_sqs_queue.email.name
  }

  tags = {
    Name = "${local.name_prefix}-email-queue-depth-alarm"
  }
}

# =============================================================================
# Outputs
# =============================================================================

output "email_queue_url" {
  description = "URL of the email SQS queue"
  value       = aws_sqs_queue.email.url
}

output "email_queue_arn" {
  description = "ARN of the email SQS queue"
  value       = aws_sqs_queue.email.arn
}

output "email_dlq_url" {
  description = "URL of the email dead letter queue"
  value       = aws_sqs_queue.email_dlq.url
}

output "email_dlq_arn" {
  description = "ARN of the email dead letter queue"
  value       = aws_sqs_queue.email_dlq.arn
}
