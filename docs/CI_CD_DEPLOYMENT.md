# CI/CD Deployment Documentation

## Overview

The AVNZ Payment Platform uses AWS ECS Fargate for container orchestration with GitHub Actions for CI/CD. All pipelines use OIDC authentication (no static AWS credentials) and are compliant with SOC2, ISO 27001, and PCI-DSS requirements.

## Architecture

```
GitHub Actions (CI/CD)
         │
         │ OIDC Token
         ▼
AWS IAM (github-actions-deploy role)
         │
         ├──► ECR (Container Registry)
         │         │
         │         ▼
         └──► ECS Fargate (Container Orchestration)
                   │
                   ▼
              ALB (Load Balancer)
                   │
                   ▼
            Route53 (DNS)
```

## Services & Endpoints

| Service | Production URL | ECR Repository | ECS Service |
|---------|---------------|----------------|-------------|
| API | https://api.avnz.io | avnz-payment-api | avnz-api |
| Admin Dashboard | https://app.avnz.io | avnz-admin-dashboard | avnz-admin-dashboard |
| Company Portal | https://my.avnz.io | avnz-company-portal | avnz-company-portal |
| Founders Landing | https://founders.avnz.io | avnz-founders | avnz-founders |

## CI/CD Pipelines

### 1. API Deployment (`deploy-api.yml`)

**Trigger:** Push to `main` on `apps/api/**` or manual dispatch

**Stages:**
1. **Test** - Linting, type checking
2. **Build** - Docker build and push to ECR
3. **Migrate** - Database migrations (optional, skippable)
4. **Deploy** - ECS service update
5. **Verify** - Health check

**Manual Options:**
- `skip_tests` - Skip tests for hotfixes
- `skip_migration` - Skip database migration

### 2. Admin Dashboard Deployment (`deploy-admin-dashboard.yml`)

**Trigger:** Push to `main` on `apps/admin-dashboard/**` or manual dispatch

**Stages:**
1. **Lint** - TypeScript and ESLint checking
2. **Build** - Next.js build and Docker push
3. **Deploy** - ECS service update
4. **Verify** - Health check

### 3. Company Portal Deployment (`deploy-company-portal.yml`)

**Trigger:** Push to `main` on `apps/company-portal/**` or manual dispatch

**Stages:**
1. **Lint** - TypeScript and ESLint checking
2. **Build** - Next.js build and Docker push
3. **Deploy** - ECS service update
4. **Verify** - Health check

### 4. Founders Landing Deployment (`deploy-founders.yml`)

**Trigger:** Push to `main` on `apps/founders-landing/**` or manual dispatch

**Stages:**
1. **Build** - Next.js build and Docker push
2. **Deploy** - ECS service update
3. **Verify** - Health check

### 5. E2E Tests (`e2e-tests.yml`)

**Trigger:** Push to `main`/`develop`, pull requests, or manual dispatch

**Coverage:**
- Authentication flows (login, logout, password reset)
- RBAC compliance tests (role-based access)
- Navigation and accessibility tests

## AWS Resources

### IAM Roles

| Role | Purpose |
|------|---------|
| `github-actions-deploy` | GitHub Actions OIDC → AWS access |
| `avnz-ecs-task-execution-role` | ECS task execution (pulling images, logging) |
| `avnz-ecs-task-role` | Application access to AWS services (S3, SES, etc.) |

### GitHub OIDC Configuration

```hcl
# OIDC Provider
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
}

# Trust Policy
{
  "Effect": "Allow",
  "Principal": {
    "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
  },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:thew0lf/payment-platform:*"
    }
  }
}
```

## Compliance Features

### SOC2 CC6.1 - Logical Access Controls
- All deployments logged with actor, timestamp, and commit SHA
- OIDC authentication (no static credentials)
- Role-based access in AWS IAM

### ISO 27001 A.12.1.2 - Change Management
- Git-based deployment (immutable infrastructure)
- Automated rollback on failure (ECS circuit breaker)
- Container image tagging with commit SHA

### PCI-DSS 6.4 - Change Control Processes
- All changes require PR and merge to main
- Automated testing before deployment
- Audit trail via CloudWatch logs (90-day retention)

### PCI-DSS 10.2 - Audit Trails
```yaml
# Deployment start logging
- name: Log Deployment Start
  run: |
    echo "::notice::Deployment initiated by ${{ github.actor }} at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "Commit: ${{ github.sha }}"
    echo "Service: ${{ env.ECS_SERVICE }}"
```

## Manual Deployment

### Hotfix Deployment (skip tests/migration)

```bash
# Via GitHub CLI
gh workflow run deploy-api.yml -f skip_tests=true -f skip_migration=true

# Via GitHub UI
# Actions → Deploy API → Run workflow → Check skip_tests
```

### Rollback

ECS automatically rolls back on deployment failure. For manual rollback:

```bash
# List recent task definitions
aws ecs list-task-definitions --family-prefix avnz-api --sort DESC --max-items 5

# Update service to previous version
aws ecs update-service \
  --cluster avnz-payment-cluster \
  --service avnz-api \
  --task-definition avnz-api:PREVIOUS_VERSION
```

## Monitoring

### Health Endpoints

| Service | Health Check |
|---------|-------------|
| API | `GET /health` |
| Admin Dashboard | `GET /` |
| Company Portal | `GET /` |
| Founders Landing | `GET /` |

### CloudWatch Logs

```bash
# View API logs
aws logs tail /ecs/avnz-api --follow

# View deployment logs
aws logs filter-log-events \
  --log-group-name /ecs/avnz-api \
  --filter-pattern "Deployment"
```

### Alerts

Configure CloudWatch alarms for:
- ECS service health (running count < desired count)
- ALB 5xx errors
- API response time > 2 seconds

## Terraform Resources

The infrastructure is defined in:

| File | Resources |
|------|-----------|
| `terraform/ecs.tf` | ECS cluster, API service, auto-scaling |
| `terraform/admin-dashboard.tf` | Admin dashboard service |
| `terraform/company-portal.tf` | Company portal service |
| `terraform/founders.tf` | Founders landing service |
| `terraform/alb.tf` | Load balancer, listeners, certificates |
| `terraform/ecr.tf` | Container registries |
| `terraform/iam.tf` | IAM roles, GitHub OIDC |
| `terraform/rds.tf` | PostgreSQL database |

## Troubleshooting

### Build Failures

1. Check GitHub Actions logs
2. Verify Dockerfile builds locally:
   ```bash
   cd apps/api && docker build -t test .
   ```
3. Check for missing dependencies or type errors

### Deployment Failures

1. Check ECS events:
   ```bash
   aws ecs describe-services --cluster avnz-payment-cluster --services avnz-api
   ```

2. Check container logs:
   ```bash
   aws logs tail /ecs/avnz-api --since 30m
   ```

3. Common issues:
   - Health check failing (wrong port or path)
   - Missing environment variables
   - Database connectivity

### DNS Issues

1. Check Route53 record:
   ```bash
   dig api.avnz.io
   ```

2. Check ALB status:
   ```bash
   aws elbv2 describe-target-health --target-group-arn <TG_ARN>
   ```

## Security Considerations

1. **No static credentials** - All AWS access via OIDC
2. **Container scanning** - ECR scans on push
3. **Secrets management** - Sensitive values in GitHub Secrets
4. **Network isolation** - ECS tasks in private subnets with NAT
5. **TLS everywhere** - HTTPS on all endpoints via ACM certificates

---

*Last Updated: December 12, 2025*
