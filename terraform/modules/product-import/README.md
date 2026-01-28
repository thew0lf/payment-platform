# Product Import Infrastructure Module

This Terraform module provisions the scalable infrastructure for the Product Import system.

## Architecture

- **ElastiCache Redis Cluster** - Bull queue backend with automatic failover
- **ECS Fargate Service** - Dedicated import workers with auto-scaling
- **Application Auto Scaling** - Scale workers based on queue depth
- **CloudWatch Alarms** - Monitor queue health, Redis performance, worker count

## Features

- **High Availability**: Multi-AZ Redis cluster with automatic failover
- **Auto-Scaling**: Workers scale from 2 to 50 based on queue depth
- **Security**: Encrypted at rest and in transit, VPC isolation
- **Monitoring**: CloudWatch alarms for critical metrics
- **Graceful Shutdown**: 60-second stop timeout for job completion

## Usage

```hcl
module "product_import" {
  source = "./modules/product-import"

  environment        = "production"
  aws_region         = "us-east-1"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids

  # Redis configuration
  redis_node_type    = "cache.r7g.large"
  redis_num_replicas = 3
  redis_auth_token   = var.redis_auth_token

  # ECS worker configuration
  ecs_cluster_id       = module.ecs.cluster_id
  ecs_cluster_name     = module.ecs.cluster_name
  worker_image         = "${data.aws_ecr_repository.api.repository_url}:latest"
  worker_cpu           = 2048
  worker_memory        = 4096
  worker_concurrency   = 5
  worker_min_count     = 2
  worker_max_count     = 50
  target_jobs_per_worker = 10

  # External dependencies
  database_secret_arn        = module.rds.database_url_secret_arn
  encryption_key_secret_arn  = module.secrets.encryption_key_secret_arn
  s3_bucket_arn              = module.s3.product_images_bucket_arn
  sns_alarm_topic_arn        = module.sns.alarm_topic_arn
  sns_critical_topic_arn     = module.sns.critical_topic_arn

  tags = {
    Environment = "production"
    Service     = "product-import"
    Terraform   = "true"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | ~> 5.0 |

## Resources Created

- 1x ElastiCache Replication Group (Redis 7.0)
- 3x ElastiCache nodes (1 primary + 2 replicas)
- 1x ElastiCache Parameter Group
- 1x ElastiCache Subnet Group
- 2x Security Groups (Redis + Worker)
- 1x ECS Task Definition
- 1x ECS Service (Fargate)
- 2x Application Auto Scaling Policies
- 4x CloudWatch Alarms
- 3x CloudWatch Log Groups
- 2x IAM Roles (Execution + Task)
- 3x IAM Policies
- 1x Secrets Manager Secret (Redis URL)

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| environment | Environment name | `string` | n/a | yes |
| vpc_id | VPC ID | `string` | n/a | yes |
| private_subnet_ids | Private subnet IDs | `list(string)` | n/a | yes |
| redis_auth_token | Redis auth token | `string` | n/a | yes |
| ecs_cluster_id | ECS cluster ID | `string` | n/a | yes |
| worker_image | Worker Docker image | `string` | n/a | yes |
| database_secret_arn | DATABASE_URL secret ARN | `string` | n/a | yes |
| worker_min_count | Min worker tasks | `number` | `2` | no |
| worker_max_count | Max worker tasks | `number` | `50` | no |

See [variables.tf](./variables.tf) for complete list.

## Outputs

| Name | Description |
|------|-------------|
| redis_endpoint | Redis primary endpoint |
| redis_configuration_endpoint | Redis config endpoint |
| worker_service_name | ECS service name |
| worker_log_group_name | CloudWatch log group |
| alarms | Map of alarm ARNs |

See [outputs.tf](./outputs.tf) for complete list.

## Auto-Scaling Behavior

Workers scale based on two metrics:

1. **Primary**: Bull queue depth (target: 10 jobs/worker)
   - Queue depth 100 → 10 workers
   - Queue depth 500 → 50 workers (capped at max)

2. **Backup**: CPU utilization (target: 70%)
   - Triggers if queue metric fails

**Cooldowns:**
- Scale out: 60 seconds
- Scale in: 300 seconds (5 minutes)

## Cost Estimate

**Monthly cost (production):**

- ElastiCache: ~$450/month (3x r7g.large)
- ECS Fargate: ~$591/month (10 workers average)
- CloudWatch: ~$65/month (logs + metrics)
- **Total: ~$1,106/month**

**Cost scales with usage:**
- 50,000 jobs/month: ~$1,600/month
- 100,000 jobs/month: ~$2,100/month
- 500,000 jobs/month: ~$4,500/month

## Monitoring

The module creates CloudWatch alarms for:

- Redis CPU > 75% (5 min)
- Redis memory > 85% (5 min)
- Queue depth > 10,000 (5 min)
- Worker count < min (3 min)

Alarms send notifications to SNS topics (configure PagerDuty/Slack integration).

## Security

- Redis encrypted at rest and in transit
- VPC isolation (private subnets only)
- Security groups restrict access to workers only
- Secrets stored in AWS Secrets Manager
- IAM roles follow least-privilege principle

## Disaster Recovery

- Redis: Daily snapshots (5-day retention)
- Automatic failover to replica (<60s)
- Workers: Stateless, can be replaced instantly
- Jobs: Persisted in PostgreSQL, can be re-queued

## Maintenance

- Redis maintenance window: Mon 05:00-07:00 UTC
- Redis snapshot window: 03:00-05:00 UTC
- Worker deployments: Blue/green with 60s drain time

## Troubleshooting

**Queue not processing:**
1. Check worker count: `aws ecs describe-services`
2. Check Redis connectivity: `redis-cli -h <endpoint> ping`
3. Check worker logs: `aws logs tail /ecs/production/product-import-worker`

**Workers not scaling:**
1. Check auto-scaling policies: `aws application-autoscaling describe-scaling-policies`
2. Check CloudWatch metrics: `BullQueueDepth` should be publishing
3. Check cooldown periods

**High Redis memory:**
1. Check queue depth
2. Increase `maxmemory-policy` aggressiveness
3. Scale up to r7g.xlarge if sustained

## References

- [Product Import Specification](../../../docs/roadmap/PRODUCT_IMPORT_SPECIFICATION.md)
- [Scalability Architecture](../../../docs/architecture/PRODUCT_IMPORT_SCALABILITY_ARCHITECTURE.md)
- [Implementation Checklist](../../../docs/architecture/PRODUCT_IMPORT_IMPLEMENTATION_CHECKLIST.md)

## License

Copyright 2025 AVNZ. All rights reserved.
