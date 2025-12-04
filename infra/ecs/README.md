# ECS/Fargate Infrastructure

## Overview

This directory contains configuration for deploying the Payment Platform API to AWS ECS Fargate.

## Files

| File | Purpose |
|------|---------|
| `task-definition-api.json` | ECS Fargate task definition for the API |
| `iam-policies.json` | IAM policies for execution and task roles |
| `secrets-setup.sh` | Script to create all required secrets in AWS Secrets Manager |

## Secrets Management

All sensitive configuration is stored in AWS Secrets Manager. The encryption key for integration credentials is loaded at runtime by the `CredentialEncryptionService`.

### Required Secrets

| Secret Name | Purpose | Loaded At |
|-------------|---------|-----------|
| `payment-platform/encryption-key` | AES-256 key for integration credentials | Runtime (app fetches) |
| `payment-platform/database-url` | PostgreSQL connection string | Container start (ECS injects) |
| `payment-platform/redis-url` | Redis connection string | Container start (ECS injects) |
| `payment-platform/jwt-secret` | JWT signing secret | Container start (ECS injects) |
| `payment-platform/auth0` | Auth0 configuration | Container start (ECS injects) |

### Why Two Loading Methods?

1. **Container start (ECS injects)**: For standard environment variables that the app reads via `process.env`. ECS fetches these and injects them before the container starts.

2. **Runtime (app fetches)**: For the encryption key, the app uses the AWS SDK to fetch from Secrets Manager directly. This allows for:
   - Key rotation without container restarts
   - Better audit logging
   - Conditional loading based on environment

## Setup

### 1. Create IAM Roles

Create two roles using the policies in `iam-policies.json`:

```bash
# Execution Role (for ECS to pull images and inject secrets)
aws iam create-role \
  --role-name payment-platform-ecs-execution-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam put-role-policy \
  --role-name payment-platform-ecs-execution-role \
  --policy-name execution-policy \
  --policy-document file://iam-policies.json#ExecutionRolePolicy

# Task Role (for the running container to access AWS services)
aws iam create-role \
  --role-name payment-platform-ecs-task-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam put-role-policy \
  --role-name payment-platform-ecs-task-role \
  --policy-name task-policy \
  --policy-document file://iam-policies.json#TaskRolePolicy
```

### 2. Create Secrets

Run the setup script with your values:

```bash
export AWS_REGION=us-east-1
export DATABASE_URL="postgresql://user:pass@host:5432/db"
export REDIS_URL="redis://host:6379"
export AUTH0_DOMAIN="your-domain.auth0.com"
export AUTH0_CLIENT_ID="xxx"
export AUTH0_CLIENT_SECRET="xxx"

./secrets-setup.sh
```

Or create manually:

```bash
# Generate a new encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create the secret
aws secretsmanager create-secret \
  --name payment-platform/encryption-key \
  --secret-string "{\"INTEGRATION_ENCRYPTION_KEY\":\"$ENCRYPTION_KEY\"}"
```

### 3. Deploy Task Definition

Replace variables and register:

```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION=us-east-1
export ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
export IMAGE_TAG="latest"

envsubst < task-definition-api.json > task-definition-rendered.json
aws ecs register-task-definition --cli-input-json file://task-definition-rendered.json
```

## Environment Variables

The container receives these environment variables:

| Variable | Source | Description |
|----------|--------|-------------|
| `NODE_ENV` | Task Definition | Set to "production" |
| `PORT` | Task Definition | API port (3001) |
| `AWS_REGION` | Task Definition | AWS region for SDK calls |
| `ENCRYPTION_KEY_SECRET_NAME` | Task Definition | Name of secret in Secrets Manager |
| `DATABASE_URL` | Secrets Manager | PostgreSQL connection |
| `REDIS_URL` | Secrets Manager | Redis connection |
| `JWT_SECRET` | Secrets Manager | JWT signing key |
| `AUTH0_*` | Secrets Manager | Auth0 configuration |

## Key Rotation

To rotate the encryption key:

1. Create a new version in Secrets Manager
2. Restart ECS tasks (or wait for next deployment)
3. Re-encrypt existing integration credentials (requires re-entering them in UI)

**Note:** Changing the encryption key invalidates all existing encrypted credentials. Plan for downtime or gradual migration.
