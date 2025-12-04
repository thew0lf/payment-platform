#!/bin/bash
# Payment Platform - AWS Secrets Manager Setup
# Run this script to create all required secrets for production deployment

set -e

AWS_REGION="${AWS_REGION:-us-east-1}"
SECRET_PREFIX="payment-platform"

echo "Creating secrets in AWS Secrets Manager (region: $AWS_REGION)"
echo "============================================================"

# Function to create or update a secret
create_secret() {
  local name=$1
  local value=$2
  local description=$3

  echo "Creating secret: $name"

  if aws secretsmanager describe-secret --secret-id "$name" --region "$AWS_REGION" 2>/dev/null; then
    echo "  Secret exists, updating..."
    aws secretsmanager update-secret \
      --secret-id "$name" \
      --secret-string "$value" \
      --region "$AWS_REGION"
  else
    echo "  Creating new secret..."
    aws secretsmanager create-secret \
      --name "$name" \
      --description "$description" \
      --secret-string "$value" \
      --region "$AWS_REGION"
  fi
  echo "  Done!"
}

# 1. Integration Encryption Key (CRITICAL - generates new key if not provided)
if [ -z "$INTEGRATION_ENCRYPTION_KEY" ]; then
  INTEGRATION_ENCRYPTION_KEY=$(openssl rand -hex 32)
  echo ""
  echo "WARNING: Generated new encryption key. Save this securely!"
  echo "Key: $INTEGRATION_ENCRYPTION_KEY"
  echo ""
fi

create_secret \
  "$SECRET_PREFIX/encryption-key" \
  "{\"INTEGRATION_ENCRYPTION_KEY\":\"$INTEGRATION_ENCRYPTION_KEY\"}" \
  "AES-256-GCM encryption key for integration credentials"

# 2. Database URL
if [ -n "$DATABASE_URL" ]; then
  create_secret \
    "$SECRET_PREFIX/database-url" \
    "$DATABASE_URL" \
    "PostgreSQL connection string"
else
  echo "SKIP: DATABASE_URL not set"
fi

# 3. Redis URL
if [ -n "$REDIS_URL" ]; then
  create_secret \
    "$SECRET_PREFIX/redis-url" \
    "$REDIS_URL" \
    "Redis connection string"
else
  echo "SKIP: REDIS_URL not set"
fi

# 4. JWT Secret
if [ -z "$JWT_SECRET" ]; then
  JWT_SECRET=$(openssl rand -base64 48)
  echo ""
  echo "Generated JWT_SECRET: $JWT_SECRET"
  echo ""
fi

create_secret \
  "$SECRET_PREFIX/jwt-secret" \
  "$JWT_SECRET" \
  "JWT signing secret"

# 5. Auth0 Configuration
if [ -n "$AUTH0_DOMAIN" ] && [ -n "$AUTH0_CLIENT_ID" ] && [ -n "$AUTH0_CLIENT_SECRET" ]; then
  create_secret \
    "$SECRET_PREFIX/auth0" \
    "{\"domain\":\"$AUTH0_DOMAIN\",\"clientId\":\"$AUTH0_CLIENT_ID\",\"clientSecret\":\"$AUTH0_CLIENT_SECRET\"}" \
    "Auth0 configuration"
else
  echo "SKIP: Auth0 credentials not fully set"
fi

echo ""
echo "============================================================"
echo "Secrets created successfully!"
echo ""
echo "Next steps:"
echo "1. Update your ECS task definition with the secret ARNs"
echo "2. Ensure the ECS execution role has secretsmanager:GetSecretValue permission"
echo "3. Ensure the ECS task role has permission to access encryption-key at runtime"
echo ""
echo "Required IAM permissions are in: infra/ecs/iam-policies.json"
