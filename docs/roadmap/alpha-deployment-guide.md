# Alpha Deployment Guide

## Table of Contents
1. [Production Data Analysis](#production-data-analysis)
2. [Network Architecture](#network-architecture)
3. [CI/CD Pipeline Design](#cicd-pipeline-design)
4. [Security Checklist](#security-checklist)
5. [Monitoring & Observability](#monitoring--observability)

---

## Production Data Analysis

### Seed Environment System

The platform uses a three-tier seeding system controlled by `SEED_ENV`:

| Environment | Command | Data Seeded |
|-------------|---------|-------------|
| `production` | `SEED_ENV=production npx prisma db seed` | Core only |
| `demo` | `SEED_ENV=demo npx prisma db seed` | Core + Demo |
| `development` | `npx prisma db seed` (default) | Core + Demo |

### Core Data (KEEP for Production)

These seeds run in ALL environments and are required for the platform to function:

| Seed File | Purpose | Notes |
|-----------|---------|-------|
| `seed-organization.ts` | AVNZ organization + admin user | **Change admin password immediately** |
| `seed-pricing.ts` | Platform billing plans | Starter, Professional, Enterprise, Custom |
| `seed-rbac.ts` | Permissions + System roles | 33 permissions, 4 system roles |
| `seed-code-review-checklist.ts` | Code review templates | Feature management |
| `seed-qa-checklist.ts` | QA checklist templates | Feature management |
| `seed-integrations.ts` | Platform integrations | Loads from `integration-defaults.json` |

### Demo Data (CLEAN for Production)

These seeds ONLY run in `demo`/`development` and must NOT exist in production:

| Seed File | Creates | Why Remove |
|-----------|---------|------------|
| `seed-clients.ts` | Velocity Agency, Coffee Co | Fake company data |
| `seed-customers.ts` | ~50 demo customers | PII/test data |
| `seed-transactions.ts` | ~200 transactions | Fake financial data |
| `seed-merchant-accounts.ts` | Demo bank accounts, pools, rules | Fake credentials |
| `seed-subscription.ts` | Demo client subscriptions | Test billing data |
| `seed-audit-logs.ts` | Demo audit entries | Misleading audit trail |
| `seed-coffee-explorer.ts` | Coffee Explorer demo client | Test tenant |
| `seed-coffee-funnel.ts` | Demo funnel | Test funnel data |
| `seed-payment-pages.ts` | Demo payment pages | Test payment pages |
| `seed-funnel-templates.ts` | Demo funnel templates | Can keep if useful |

### Production Deployment Steps

```bash
# 1. Fresh database with production seeds only
SEED_ENV=production npx prisma migrate deploy
SEED_ENV=production npx prisma db seed

# 2. Configure integrations
# Create: apps/api/prisma/seeds/data/integration-defaults.json
# Add your PRODUCTION credentials for AWS, Auth0, etc.

# 3. Re-run seed to load integrations
SEED_ENV=production npx prisma db seed

# 4. IMMEDIATELY change admin password via UI or API
```

### Integration Defaults Template

Create `apps/api/prisma/seeds/data/integration-defaults.json`:

```json
{
  "organizationId": "YOUR_ORG_ID_FROM_DB",
  "platformIntegrations": [
    {
      "provider": "AUTH0",
      "name": "Auth0 Production",
      "environment": "PRODUCTION",
      "isSharedWithClients": false,
      "credentials": {
        "domain": "your-tenant.auth0.com",
        "clientId": "REAL_CLIENT_ID",
        "clientSecret": "REAL_CLIENT_SECRET",
        "audience": "https://api.avnz.io"
      }
    },
    {
      "provider": "AWS_S3",
      "name": "AWS S3 Storage",
      "environment": "PRODUCTION",
      "isSharedWithClients": true,
      "credentials": {
        "region": "us-east-1",
        "accessKeyId": "REAL_ACCESS_KEY",
        "secretAccessKey": "REAL_SECRET_KEY",
        "bucketName": "avnz-production-assets"
      }
    },
    {
      "provider": "AWS_SES",
      "name": "AWS SES Email",
      "environment": "PRODUCTION",
      "isSharedWithClients": true,
      "credentials": {
        "region": "us-east-1",
        "accessKeyId": "REAL_ACCESS_KEY",
        "secretAccessKey": "REAL_SECRET_KEY",
        "fromEmail": "noreply@avnz.io"
      }
    }
  ]
}
```

---

## Network Architecture

### AWS Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Route 53 (DNS)                                  │
│  *.avnz.io → CloudFront    api.avnz.io → ALB    *.client.avnz.io → ALB     │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CloudFront Distribution                             │
│  • SSL/TLS termination           • WAF integration                           │
│  • Static asset caching          • DDoS protection                           │
│  • Geographic routing            • Origin failover                           │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Application Load Balancer                             │
│                              (Public Subnet)                                 │
│  • Health checks               • Path-based routing                         │
│  • SSL termination            • Sticky sessions                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│   ECS Fargate       │ │   ECS Fargate       │ │   ECS Fargate       │
│   API Service       │ │   Admin Dashboard   │ │   Company Portal    │
│   (Private Subnet)  │ │   (Private Subnet)  │ │   (Private Subnet)  │
│                     │ │                     │ │                     │
│   Port: 3001        │ │   Port: 3000        │ │   Port: 3003        │
│   Min: 2, Max: 10   │ │   Min: 2, Max: 6    │ │   Min: 2, Max: 6    │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
            │                     │                      │
            └─────────────────────┼──────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│      RDS PostgreSQL         │   │      ElastiCache Redis      │
│      (Private Subnet)       │   │      (Private Subnet)       │
│                             │   │                             │
│  • db.r6g.large            │   │  • cache.r6g.large          │
│  • Multi-AZ deployment     │   │  • Cluster mode enabled     │
│  • Automated backups       │   │  • 2 replicas               │
│  • Point-in-time recovery  │   │  • Automatic failover       │
└─────────────────────────────┘   └─────────────────────────────┘
```

### VPC Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VPC: 10.0.0.0/16                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Availability Zone A                               ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         ││
│  │  │  Public Subnet  │  │ Private Subnet  │  │   DB Subnet     │         ││
│  │  │  10.0.1.0/24    │  │  10.0.10.0/24   │  │  10.0.20.0/24   │         ││
│  │  │                 │  │                 │  │                 │         ││
│  │  │  • NAT Gateway  │  │  • ECS Tasks    │  │  • RDS Primary  │         ││
│  │  │  • ALB          │  │  • Lambda       │  │  • ElastiCache  │         ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Availability Zone B                               ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         ││
│  │  │  Public Subnet  │  │ Private Subnet  │  │   DB Subnet     │         ││
│  │  │  10.0.2.0/24    │  │  10.0.11.0/24   │  │  10.0.21.0/24   │         ││
│  │  │                 │  │                 │  │                 │         ││
│  │  │  • NAT Gateway  │  │  • ECS Tasks    │  │  • RDS Standby  │         ││
│  │  │  • ALB          │  │  • Lambda       │  │  • ElastiCache  │         ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Security Groups

```yaml
# ALB Security Group
alb-sg:
  inbound:
    - port: 443, source: 0.0.0.0/0  # HTTPS from internet
    - port: 80, source: 0.0.0.0/0   # HTTP redirect to HTTPS
  outbound:
    - port: 3000-3003, destination: ecs-sg

# ECS Tasks Security Group
ecs-sg:
  inbound:
    - port: 3000-3003, source: alb-sg
  outbound:
    - port: 5432, destination: rds-sg
    - port: 6379, destination: redis-sg
    - port: 443, destination: 0.0.0.0/0  # AWS APIs

# RDS Security Group
rds-sg:
  inbound:
    - port: 5432, source: ecs-sg
    - port: 5432, source: bastion-sg  # Admin access

# Redis Security Group
redis-sg:
  inbound:
    - port: 6379, source: ecs-sg
```

### Domain Structure

| Domain | Service | SSL Certificate |
|--------|---------|-----------------|
| `avnz.io` | Marketing site | ACM Wildcard |
| `app.avnz.io` | Admin Dashboard | ACM Wildcard |
| `api.avnz.io` | NestJS API | ACM Wildcard |
| `portal.avnz.io` | Company Portal | ACM Wildcard |
| `founders.avnz.io` | Founders Landing | ACM Wildcard |
| `*.client.avnz.io` | White-label portals | ACM Wildcard |

---

## CI/CD Pipeline Design

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com

jobs:
  # ═══════════════════════════════════════════════════════════════
  # STAGE 1: Test & Build
  # ═══════════════════════════════════════════════════════════════
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test

      - name: E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

  build:
    needs: test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [api, admin-dashboard, company-portal]
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./apps/${{ matrix.service }}/Dockerfile
          push: true
          tags: |
            ${{ env.ECR_REGISTRY }}/avnz-${{ matrix.service }}:${{ github.sha }}
            ${{ env.ECR_REGISTRY }}/avnz-${{ matrix.service }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ═══════════════════════════════════════════════════════════════
  # STAGE 2: Deploy to Staging
  # ═══════════════════════════════════════════════════════════════
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging' || github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Run database migrations
        run: |
          aws ecs run-task \
            --cluster avnz-staging \
            --task-definition avnz-migrations \
            --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SG]}"

      - name: Deploy to ECS Staging
        run: |
          aws ecs update-service --cluster avnz-staging --service avnz-api --force-new-deployment
          aws ecs update-service --cluster avnz-staging --service avnz-admin --force-new-deployment
          aws ecs update-service --cluster avnz-staging --service avnz-portal --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable --cluster avnz-staging --services avnz-api avnz-admin avnz-portal

      - name: Run smoke tests
        run: |
          curl -f https://staging-api.avnz.io/health || exit 1
          curl -f https://staging.avnz.io || exit 1

  # ═══════════════════════════════════════════════════════════════
  # STAGE 3: Deploy to Production
  # ═══════════════════════════════════════════════════════════════
  deploy-production:
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Run database migrations
        run: |
          aws ecs run-task \
            --cluster avnz-production \
            --task-definition avnz-migrations \
            --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNETS],securityGroups=[$ECS_SG]}"

      - name: Blue/Green deployment
        run: |
          # Update task definition with new image
          aws ecs update-service \
            --cluster avnz-production \
            --service avnz-api \
            --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true}" \
            --force-new-deployment

          aws ecs update-service \
            --cluster avnz-production \
            --service avnz-admin \
            --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true}" \
            --force-new-deployment

          aws ecs update-service \
            --cluster avnz-production \
            --service avnz-portal \
            --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true}" \
            --force-new-deployment

      - name: Wait for deployment
        run: |
          aws ecs wait services-stable \
            --cluster avnz-production \
            --services avnz-api avnz-admin avnz-portal

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Deployed to production: ${{ github.sha }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production Deployment Complete*\nCommit: `${{ github.sha }}`\nBy: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### ECS Task Definition (API)

```json
{
  "family": "avnz-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/avnz-api-task-role",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/avnz-api:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3001" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:avnz/database-url"
        },
        {
          "name": "REDIS_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:avnz/redis-url"
        },
        {
          "name": "INTEGRATION_ENCRYPTION_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:avnz/encryption-key"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:avnz/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/avnz-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Infrastructure as Code (Terraform)

```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "avnz-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

module "vpc" {
  source = "./modules/vpc"

  name               = "avnz-production"
  cidr               = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]
}

module "ecs" {
  source = "./modules/ecs"

  cluster_name = "avnz-production"
  vpc_id       = module.vpc.vpc_id
  subnets      = module.vpc.private_subnets

  services = {
    api = {
      cpu           = 1024
      memory        = 2048
      desired_count = 2
      max_capacity  = 10
      port          = 3001
    }
    admin = {
      cpu           = 512
      memory        = 1024
      desired_count = 2
      max_capacity  = 6
      port          = 3000
    }
    portal = {
      cpu           = 512
      memory        = 1024
      desired_count = 2
      max_capacity  = 6
      port          = 3003
    }
  }
}

module "rds" {
  source = "./modules/rds"

  identifier        = "avnz-production"
  instance_class    = "db.r6g.large"
  allocated_storage = 100
  multi_az          = true

  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.database_subnets
  allowed_security_groups = [module.ecs.security_group_id]
}

module "elasticache" {
  source = "./modules/elasticache"

  cluster_id         = "avnz-production"
  node_type          = "cache.r6g.large"
  num_cache_clusters = 2

  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.database_subnets
  allowed_security_groups = [module.ecs.security_group_id]
}
```

---

## Security Checklist

### Pre-Deployment

- [ ] **Secrets Management**
  - [ ] All secrets in AWS Secrets Manager (not environment variables)
  - [ ] Encryption key for integrations configured
  - [ ] JWT secret rotated from development
  - [ ] Database credentials unique per environment

- [ ] **Network Security**
  - [ ] VPC configured with private subnets
  - [ ] Security groups restrict access appropriately
  - [ ] NAT Gateway for outbound traffic from private subnets
  - [ ] VPC Flow Logs enabled

- [ ] **Application Security**
  - [ ] HTTPS enforced (HTTP redirects to HTTPS)
  - [ ] CORS configured for production domains only
  - [ ] Rate limiting enabled on API
  - [ ] Input validation on all endpoints
  - [ ] SQL injection protection (Prisma ORM)
  - [ ] XSS protection (React auto-escaping)

- [ ] **Authentication**
  - [ ] Auth0 production tenant configured
  - [ ] MFA enabled for admin users
  - [ ] Session timeout configured (15 min idle)
  - [ ] Password policy enforced

- [ ] **Data Protection**
  - [ ] PII encrypted at rest (RDS encryption)
  - [ ] PII encrypted in transit (TLS 1.3)
  - [ ] Card data encrypted with AES-256-GCM
  - [ ] Audit logging enabled
  - [ ] GDPR compliance (data deletion, export)

### Post-Deployment

- [ ] Security scan (OWASP ZAP)
- [ ] Penetration testing scheduled
- [ ] WAF rules configured
- [ ] DDoS protection enabled (CloudFront + Shield)
- [ ] Backup verification test

---

## Monitoring & Observability

### CloudWatch Dashboards

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AVNZ Production Dashboard                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ API Health      │  │ Request Rate    │  │ Error Rate      │             │
│  │                 │  │                 │  │                 │             │
│  │   ██████ 100%   │  │   ▁▂▃▅▆▇█▇▆    │  │   ▁▁▁▁▁▁▁▁▁    │             │
│  │                 │  │   1.2k req/min  │  │   0.02%         │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        Response Time (P50/P95/P99)                       ││
│  │  ▁▂▂▃▃▄▄▅▅▆▆▇▇██▇▇▆▆▅▅▄▄▃▃▂▂▁▁▂▂▃▃▄▄▅▅▆▆▇▇██▇▇▆▆▅▅▄▄▃▃▂▂▁▁            ││
│  │  P50: 45ms    P95: 120ms    P99: 250ms                                   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ Database Connections        │  │ Redis Hit Rate              │          │
│  │ ▁▂▃▄▅▆▇█▇▆▅▄▃▂▁            │  │ ████████████████████ 98.5%  │          │
│  │ Current: 45 / Max: 100      │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Alerting Rules

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| API Error Rate | > 1% | > 5% | Page on-call |
| Response Time P95 | > 500ms | > 2000ms | Investigate |
| CPU Usage | > 70% | > 90% | Scale out |
| Memory Usage | > 80% | > 95% | Scale out |
| Database Connections | > 80% | > 95% | Increase pool |
| Disk Usage | > 70% | > 90% | Expand storage |
| Failed Login Attempts | > 10/min | > 50/min | Block IP |

### Log Aggregation

```yaml
# All logs ship to CloudWatch Logs
Log Groups:
  /ecs/avnz-api:
    retention: 30 days
    subscription: → OpenSearch for analysis

  /ecs/avnz-admin:
    retention: 30 days

  /ecs/avnz-portal:
    retention: 30 days

  /aws/rds/avnz-production:
    retention: 90 days  # Compliance

  /audit-logs:
    retention: 365 days  # SOC2 requirement
    encryption: KMS
```

---

## Estimated Monthly Costs (Alpha)

| Service | Configuration | Est. Cost |
|---------|---------------|-----------|
| ECS Fargate | 3 services x 2 tasks | $150 |
| RDS PostgreSQL | db.r6g.large Multi-AZ | $350 |
| ElastiCache Redis | cache.r6g.large x2 | $200 |
| ALB | 1 load balancer | $25 |
| CloudFront | 100GB transfer | $15 |
| Route 53 | 1 hosted zone | $0.50 |
| NAT Gateway | 2 AZs | $70 |
| CloudWatch | Logs + Metrics | $50 |
| Secrets Manager | ~10 secrets | $5 |
| S3 | 50GB storage | $5 |
| **Total** | | **~$870/month** |

---

## Rollback Procedures

### Automatic Rollback
- ECS deployment circuit breaker enabled
- Automatic rollback on health check failures
- Maximum 10% error rate triggers rollback

### Manual Rollback
```bash
# 1. Get previous task definition revision
aws ecs describe-services --cluster avnz-production --services avnz-api \
  --query 'services[0].deployments[*].taskDefinition'

# 2. Update service to previous revision
aws ecs update-service \
  --cluster avnz-production \
  --service avnz-api \
  --task-definition avnz-api:PREVIOUS_REVISION

# 3. Rollback database if needed
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier avnz-production \
  --target-db-instance-identifier avnz-production-rollback \
  --restore-time 2024-01-15T10:00:00Z
```

---

*Last Updated: December 11, 2025*
*Version: Alpha 1.0*
